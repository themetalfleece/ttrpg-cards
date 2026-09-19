/** One structural failure, ready to show beside the input that caused it. */
export interface ValidationIssue {
  /** JSON pointer into the checked value, such as `/meta/0/label`. */
  path: string;
  message: string;
}
