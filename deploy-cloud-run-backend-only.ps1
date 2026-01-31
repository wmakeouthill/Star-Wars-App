$ErrorActionPreference = "Stop"

<#
Deploy Cloud Run (backend Python only) — build local + push + deploy

Uso:
  .\deploy-cloud-run-backend-only.ps1 -ProjectId "seu-projeto" -Region "southamerica-east1"

Nota importante:
  Cloud Run SEMPRE precisa puxar a imagem de um registry (não existe “deploy direto do Docker local”).
  Este script usa Artifact Registry (recomendado).
#>

param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [Parameter(Mandatory = $false)]
  [string]$Region = "southamerica-east1",

  [Parameter(Mandatory = $false)]
  [string]$ServiceName = "holocron-backend",

  [Parameter(Mandatory = $false)]
  [string]$ArtifactRepo = "cloud-run",

  [Parameter(Mandatory = $false)]
  [string]$ImageTag = "latest"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Cloud Run Deploy (Backend Python)" -ForegroundColor Cyan
Write-Host "  Build local + Push + Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar gcloud e docker
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
  Write-Host "ERRO: gcloud CLI não está instalado. https://cloud.google.com/sdk/docs/install" -ForegroundColor Red
  exit 1
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "ERRO: Docker não está instalado (ou não está no PATH)." -ForegroundColor Red
  exit 1
}

Write-Host "[1/6] Autenticação e projeto..." -ForegroundColor Green
$activeAccount = (gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>$null | Select-Object -First 1)
if ([string]::IsNullOrWhiteSpace($activeAccount)) {
  Write-Host "ERRO: você não está autenticado. Rode: gcloud auth login" -ForegroundColor Red
  exit 1
}
gcloud config set project $ProjectId | Out-Null
Write-Host "OK: $activeAccount (project=$ProjectId)" -ForegroundColor Green

Write-Host ""
Write-Host "[2/6] Habilitando APIs mínimas..." -ForegroundColor Green
$apis = @(
  "run.googleapis.com",
  "secretmanager.googleapis.com",
  "artifactregistry.googleapis.com"
)
foreach ($api in $apis) {
  Write-Host " - $api" -ForegroundColor Yellow
  gcloud services enable $api --project $ProjectId | Out-Null
}

Write-Host ""
Write-Host "[3/6] Preparando IAM para ler secrets..." -ForegroundColor Green
$projectNumber = (gcloud projects describe $ProjectId --format="value(projectNumber)" 2>$null).ToString().Trim()
if ([string]::IsNullOrWhiteSpace($projectNumber)) {
  Write-Host "ERRO: não consegui descobrir projectNumber." -ForegroundColor Red
  exit 1
}
$runtimeSa = "$projectNumber-compute@developer.gserviceaccount.com"
Write-Host "Runtime SA (assumido): $runtimeSa" -ForegroundColor Cyan
gcloud projects add-iam-policy-binding $ProjectId `
  --member="serviceAccount:$runtimeSa" `
  --role="roles/secretmanager.secretAccessor" | Out-Null

Write-Host ""
Write-Host "[4/6] Artifact Registry (repo Docker)..." -ForegroundColor Green
gcloud artifacts repositories describe $ArtifactRepo --location $Region --project $ProjectId 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Criando repo '$ArtifactRepo' em '$Region'..." -ForegroundColor Yellow
  gcloud artifacts repositories create $ArtifactRepo `
    --repository-format=docker `
    --location=$Region `
    --description="Imagens Docker para Cloud Run" `
    --project=$ProjectId | Out-Null
} else {
  Write-Host "OK: repo '$ArtifactRepo' já existe." -ForegroundColor Green
}

Write-Host "Configurando Docker auth para '$Region-docker.pkg.dev'..." -ForegroundColor Green
gcloud auth configure-docker "$Region-docker.pkg.dev" --quiet | Out-Null

$image = "$Region-docker.pkg.dev/$ProjectId/$ArtifactRepo/$ServiceName`:$ImageTag"

Write-Host ""
Write-Host "[5/6] Build + push da imagem..." -ForegroundColor Green
Write-Host "Imagem: $image" -ForegroundColor Cyan
docker build -f "backend/Dockerfile.cloud-run" -t $image "backend"
if ($LASTEXITCODE -ne 0) { throw "Falha no build da imagem." }
docker push $image
if ($LASTEXITCODE -ne 0) { throw "Falha no push da imagem." }

Write-Host ""
Write-Host "[6/6] Deploy no Cloud Run (free-tier friendly)..." -ForegroundColor Green

# Secrets recomendados (nomes) -> env vars usadas pelo app
# - DATABASE_HOST/PORT/NAME/USERNAME podem ser env vars normais (não-secret).
# - Senhas/chaves devem ser Secret Manager.
$requiredSecrets = @(
  "holocron-jwt-secret-key",
  "holocron-db-password"
)

$optionalSecrets = @(
  "holocron-openai-api-key"
)

$missing = @()
foreach ($s in $requiredSecrets) {
  gcloud secrets describe $s --project $ProjectId 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) { $missing += $s }
}
if ($missing.Count -gt 0) {
  Write-Host "ERRO: faltam secrets obrigatórios:" -ForegroundColor Red
  $missing | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
  Write-Host ""
  Write-Host "Crie os secrets no Secret Manager e rode novamente." -ForegroundColor Yellow
  exit 1
}

$hasOpenAi = $false
gcloud secrets describe "holocron-openai-api-key" --project $ProjectId 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) { $hasOpenAi = $true }

$secretsArg = @(
  "JWT_SECRET_KEY=holocron-jwt-secret-key:latest",
  "DATABASE_PASSWORD=holocron-db-password:latest"
)
if ($hasOpenAi) { $secretsArg += "OPENAI_API_KEY=holocron-openai-api-key:latest" }

# Ajuste CORS para o domínio do seu frontend em produção
$cors = "http://localhost:5173,http://127.0.0.1:5173"

gcloud run deploy $ServiceName `
  --image $image `
  --region $Region `
  --platform managed `
  --allow-unauthenticated `
  --memory 512Mi `
  --cpu 1 `
  --timeout 60 `
  --max-instances 1 `
  --min-instances 0 `
  --concurrency 20 `
  --port 8080 `
  --set-secrets=($secretsArg -join ",") `
  --set-env-vars="APP_NAME=Holocron Analytics API,APP_VERSION=0.1.0,JWT_ISSUER=holocron-analytics,JWT_ACCESS_TTL_SECONDS=900,JWT_REFRESH_TTL_SECONDS=2592000,AUTH_COOKIE_SECURE=true,AUTH_COOKIE_SAMESITE=lax,CORS_ALLOW_ORIGINS=$cors,DATABASE_HOST=postgresql.uhserver.com,DATABASE_PORT=5432,DATABASE_NAME=star_wars_app,DATABASE_USERNAME=wmakeouthill,AI_ENABLED=false,AI_PROVIDER=openai,OPENAI_MODEL=gpt-4o-mini,SWAPI_BASE_URL=https://swapi.dev/api,CACHE_TTL_SECONDS=3600" `
  --project $ProjectId

$serviceUrl = (gcloud run services describe $ServiceName --region $Region --format="value(status.url)" --project $ProjectId 2>$null).ToString().Trim()
Write-Host ""
Write-Host "OK: Deploy concluído." -ForegroundColor Green
Write-Host "URL: $serviceUrl" -ForegroundColor Cyan

