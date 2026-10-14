export interface ApiInstruction {
  key: string;
  label: string;
  description: string;
  content: string;
  /** The compiled system default, for the comparison view in the admin area. */
  defaultContent?: string;
  version: number;
  isCustomized: boolean;
  updatedAt: string | null;
}
