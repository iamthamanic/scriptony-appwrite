/**
 * Ambient module: Vite resolves `wavesurfer.js@7.8.10/dist/plugins/regions.esm.js` via alias;
 * provide typings so `tsc` does not treat the plugin as untyped.
 */
declare module "wavesurfer.js@7.8.10/dist/plugins/regions.esm.js" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const RegionsPlugin: any;
  export default RegionsPlugin;
}
