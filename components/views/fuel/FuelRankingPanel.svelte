<script>
  import { data as dataStore } from '../../../stores/data.js';
  import DataGrid from '../../shared/DataGrid.svelte';
  import Loader from '../../shared/Loader.svelte';
  import { fmtCurrency, fmtNum, fmtDate, fmtEfficiency } from '@/lib/fuelFormat.js';

  export let loading = false;
  export let data = [];

  function getAssetLabel(r) {
    if (r.assetType === 'MACHINE') {
      const machine = $dataStore.machines?.find(m => m.id === r.assetId);
      if (machine) {
        const parts = [machine.name, machine.model, r.assetPlate].filter(p => p && p.trim());
        return parts.join(' · ');
      }
    } else if (r.assetType === 'VEHICLE') {
      const vehicle = $dataStore.vehicles?.find(v => v.id === r.assetId);
      if (vehicle) {
        const parts = [r.assetPlate, vehicle.marca].filter(p => p && p.trim());
        return parts.join(' — ');
      }
    } else if (r.assetType === 'MOTO') {
      const moto = $dataStore.motos?.find(m => m.id === r.assetId);
      if (moto) {
        const parts = [r.assetPlate, moto.marca].filter(p => p && p.trim());
        return parts.join(' — ');
      }
    }
    return r.assetPlate || `ID ${r.assetId}`;
  }

  $: rankMaxGallons = Math.max(...data.map(r => Number(r.quantityGallons ?? 0)), 1);

  $: rankingEnriched = data.map(r => {
    const factoryUnit = r.factoryEfficiencyUnit === 'KM_PER_GALLON' ? 'km/Gal'
      : r.factoryEfficiencyUnit === 'KM_PER_CUBIC_METER' ? 'km/m³'
      : r.factoryEfficiencyUnit === 'GAL_PER_HOUR' ? 'Gal/h'
      : r.factoryEfficiencyUnit === 'M3_PER_HOUR' ? 'm³/h' : '';
    return {
      ...r,
      _barPct:       Number(r.quantityGallons ?? 0) / rankMaxGallons * 100,
      _effLabel:     fmtEfficiency(r),
      _factoryLabel: r.factoryEfficiency != null ? `${fmtNum(r.factoryEfficiency, 2)} ${factoryUnit}` : '—',
      _gallonsLabel: fmtNum(r.quantityGallons, 3) + ' Gal',
      _costLabel:    fmtCurrency(r.totalCostCalculated),
      _dateLabel:    fmtDate(r.fuelDateTime),
    };
  });

  const rankingColumns = [
    { id: 'pos',     header: '#',                accessorFn: () => 0,                      size: 45,  enableSorting: false, meta: { isRankPosition: true } },
    { accessorKey: 'assetType',  header: 'Tipo',          size: 80 },
    { id: 'plate', header: 'Placa / Nombre', accessorFn: getAssetLabel, size: 200 },
    { id: 'gallons', header: 'Galones totales',  accessorFn: r => Number(r.quantityGallons ?? 0), size: 120,
      cell: info => info.row.original._gallonsLabel },
    { id: 'bar',     header: 'Consumo relativo', accessorFn: r => r._barPct,               size: 160, enableSorting: false, meta: { isRankBar: true } },
    { id: 'cost',    header: 'Costo total',      accessorFn: r => Number(r.totalCostCalculated ?? 0), size: 110,
      cell: info => info.row.original._costLabel },
    { id: 'factEff', header: 'Efic. Fábrica',    accessorFn: r => r.factoryEfficiency != null ? Number(r.factoryEfficiency) : null, size: 100,
      cell: info => info.row.original._factoryLabel },
    { id: 'estEff',  header: 'Efic. Estimada',   accessorFn: r => r.efficiencyValue != null ? Number(r.efficiencyValue) : null,  size: 130,
      meta: { isEfficiencyRank: true },
      cell: info => info.row.original._effLabel },
    { id: 'date',    header: 'Últ. carga',       accessorFn: r => r.fuelDateTime ? new Date(r.fuelDateTime).getTime() : 0, size: 130,
      cell: info => info.row.original._dateLabel },
  ];
</script>

{#if loading}
  <div class="loader-container"><Loader /><p>Cargando ranking...</p></div>
{:else if data.length === 0}
  <div class="empty-msg">Sin datos de ranking para el período seleccionado.</div>
{:else}
  <DataGrid
    columns={rankingColumns}
    data={rankingEnriched}
    totalElements={rankingEnriched.length}
    totalPages={Math.max(1, Math.ceil(rankingEnriched.length / 20))}
    currentPage={0}
    pageSize={20}
    showPagination={true}
  />
{/if}

<style>
  .loader-container { display: flex; flex-direction: column; align-items: center; height: 160px; justify-content: center; gap: 12px; font-size: 11px; }
  .empty-msg { text-align: center; padding: 32px; color: #666; font-size: 12px; }
</style>
