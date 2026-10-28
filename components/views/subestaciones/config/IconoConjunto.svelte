<script>
  import { trazoIcono } from "../../../../config/iconosConjunto.js";

  /** Código del ícono (SUBESTACION, GABINETE…); null = genérico. */
  export let codigo = null;
  export let size = 20;
  export let color = "#7a5a12";
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true"><path d={trazoIcono(codigo)}></path></svg>
