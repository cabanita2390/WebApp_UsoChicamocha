<script>
  import { subestacionesToast } from "../../../stores/subestacionesToast.js";
</script>

{#if $subestacionesToast}
  <div class="sub-toast" class:error={$subestacionesToast.error} role="status">{$subestacionesToast.text}</div>
{/if}
