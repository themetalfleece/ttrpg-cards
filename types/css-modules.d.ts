declare module "*.module.css" {
  const classNames: Readonly<Record<string, string>>;
  export default classNames;
}

/** Plain stylesheets are imported for their side effect only. */
declare module "*.css";
