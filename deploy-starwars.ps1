$ErrorActionPreference = "Stop"

<#
Deploy Cloud Run (Star Wars backend Python) — build local + push + deploy

Uso (modo rápido, sem parâmetros):
  .\deploy-starwars.ps1

APIs mínimas que este script habilita:
  - run.googleapis.com
  - secretmanager.googleapis.com
  - artifactregistry.googleapis.com
  - iam.googleapis.com (para criar Service Account)

Nota importante:
  Cloud Run SEMPRE precisa puxar a imagem de um registry (não existe “deploy direto do Docker local”).
  Este script usa Artifact Registry (recomendado).
#>

param(
  [Parameter(Mandatory = $false)]
  [string]$ProjectId = "star-wars-app-485918",

  [Parameter(Mandatory = $false)]
  [string]$Region = "southamerica-east1",

  [Parameter(Mandatory = $false)]
  [string]$ServiceName = "star-wars-backend",

  [Parameter(Mandatory = $false)]
  [string]$ArtifactRepo = "cloud-run",

  [Parameter(Mandatory = $false)]
  [string]$ImageTag = "latest",

  # Service Account (runtime) do Cloud Run
  # Este "usuário" é o que precisa de roles/secretmanager.secretAccessor
  [Parameter(Mandatory = $false)]
  [string]$RuntimeServiceAccountId = "star-wars-cloudrun-runtime",

  # Google OAuth (NÃO é secret, mas é obrigatório se você usa login Google)
  [Parameter(Mandatory = $false)]
  [string]$GoogleOauthClientId = "506724076071-92k26dvdmapll0lqj1crc4onq69am7o1.apps.googleusercontent.com",

  # Cookies (refresh token)
  # Em produção (HTTPS) => Secure=true
  # Se frontend estiver em domínio diferente do backend, normalmente precisa SameSite=none.
  [Parameter(Mandatory = $false)]
  [bool]$AuthCookieSecure = $true,

  [Parameter(Mandatory = $false)]
  [string]$AuthCookieSameSite = "none",

  # DB (não-secret; a senha vem do Secret Manager)
  [Parameter(Mandatory = $false)]
  [string]$DatabaseHost = "postgresql.uhserver.com",

  [Parameter(Mandatory = $false)]
  [int]$DatabasePort = 5432,

  [Parameter(Mandatory = $false)]
  [string]$DatabaseName = "star_wars_app",

  [Parameter(Mandatory = $false)]
  [string]$DatabaseUsername = "wmakeouthill",

  # CORS (ajuste depois para o domínio real do frontend)
  [Parameter(Mandatory = $false)]
  [string]$CorsAllowOrigins = "http://localhost:5173,http://127.0.0.1:5173"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Cloud Run Deploy (Star Wars Backend)" -ForegroundColor Cyan
Write-Host "  Project: $ProjectId | Region: $Region" -ForegroundColor Cyan
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
  "artifactregistry.googleapis.com",
  "iam.googleapis.com"
)
foreach ($api in $apis) {
  Write-Host " - $api" -ForegroundColor Yellow
  gcloud services enable $api --project $ProjectId | Out-Null
}

Write-Host ""
Write-Host "[3/6] Criando/ajustando Service Account (runtime)..." -ForegroundColor Green
$projectNumber = (gcloud projects describe $ProjectId --format="value(projectNumber)" 2>$null).ToString().Trim()
if ([string]::IsNullOrWhiteSpace($projectNumber)) {
  Write-Host "ERRO: não consegui descobrir projectNumber." -ForegroundColor Red
  exit 1
}

$runtimeSaEmail = "$RuntimeServiceAccountId@$ProjectId.iam.gserviceaccount.com"
Write-Host "Runtime SA (dedicado): $runtimeSaEmail" -ForegroundColor Cyan

# Criar SA se não existir
gcloud iam service-accounts describe $runtimeSaEmail --project $ProjectId 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Criando Service Account '$RuntimeServiceAccountId'..." -ForegroundColor Yellow
  gcloud iam service-accounts create $RuntimeServiceAccountId `
    --display-name="Star Wars Cloud Run Runtime" `
    --project $ProjectId | Out-Null
}

# Permissões mínimas para o runtime ler secrets
gcloud projects add-iam-policy-binding $ProjectId `
  --member="serviceAccount:$runtimeSaEmail" `
  --role="roles/secretmanager.secretAccessor" | Out-Null

# (Opcional, mas ajuda a evitar erro de pull/artefatos em alguns setups)
gcloud projects add-iam-policy-binding $ProjectId `
  --member="serviceAccount:$runtimeSaEmail" `
  --role="roles/artifactregistry.reader" | Out-Null

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

# Secrets (nomes) -> env vars usadas pelo app:
# Obrigatórios:
# - holocron-db-password -> DATABASE_PASSWORD
# - holocron-jwt-secret-key -> JWT_SECRET_KEY
# Opcional:
# - holocron-openai-api-key -> OPENAI_API_KEY
$requiredSecrets = @(
  "holocron-jwt-secret-key",
  "holocron-db-password"
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

gcloud run deploy $ServiceName `
  --image $image `
  --region $Region `
  --platform managed `
  --allow-unauthenticated `
  --service-account $runtimeSaEmail `
  --memory 512Mi `
  --cpu 1 `
  --timeout 60 `
  --max-instances 1 `
  --min-instances 0 `
  --concurrency 20 `
  --port 8080 `
  --set-secrets=($secretsArg -join ",") `
  --set-env-vars="^~^APP_NAME=Holocron Analytics API~APP_VERSION=0.1.0~JWT_ISSUER=holocron-analytics~JWT_ACCESS_TTL_SECONDS=900~JWT_REFRESH_TTL_SECONDS=2592000~GOOGLE_OAUTH_CLIENT_ID=$GoogleOauthClientId~AUTH_COOKIE_SECURE=$AuthCookieSecure~AUTH_COOKIE_SAMESITE=$AuthCookieSameSite~CORS_ALLOW_ORIGINS=$CorsAllowOrigins~DATABASE_HOST=$DatabaseHost~DATABASE_PORT=$DatabasePort~DATABASE_NAME=$DatabaseName~DATABASE_USERNAME=$DatabaseUsername~AI_ENABLED=false~AI_PROVIDER=openai~OPENAI_MODEL=gpt-4o-mini~SWAPI_BASE_URL=https://swapi.dev/api~CACHE_TTL_SECONDS=3600" `
  --project $ProjectId

$serviceUrl = (gcloud run services describe $ServiceName --region $Region --format="value(status.url)" --project $ProjectId 2>$null).ToString().Trim()
Write-Host ""
Write-Host "OK: Deploy concluído." -ForegroundColor Green
Write-Host "Serviço: $ServiceName" -ForegroundColor Cyan
Write-Host "URL: $serviceUrl" -ForegroundColor Cyan

