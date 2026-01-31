export interface ChartDatum {
  name: string;
  value: number;
}

export interface ScatterDatum {
  name: string;
  x: number;
  y: number;
  z?: number;
  category?: string;
}

export interface RadarDatum {
  subject: string;
  value: number;
  fullMark?: number;
  [key: string]: string | number | undefined;
}

export interface TreemapDatum {
  name: string;
  value: number;
  category?: string;
  children?: TreemapDatum[];
}

export interface StackedDatum {
  name: string;
  [key: string]: string | number;
}

