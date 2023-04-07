export interface Struct {
  super: string | 'None';
  propertyCount: number;
  properties: Record<string, string>;
}
