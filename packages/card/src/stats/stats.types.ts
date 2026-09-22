/** A stat value split from the prose that was trailing it in brackets. */
export interface LiftedParenthetical {
  /** What the cell keeps. */
  readonly value: string;
  /** The prose to put in the body, absent when there was none to lift. */
  readonly lifted: string | undefined;
}
