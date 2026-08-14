import { useState, type FormEvent } from "react";
import {
  Alert,
  Button,
  Card,
  CardHeader,
  Checkbox,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { PERMISSIONS, useAuth } from "@/features/auth";
import { getApiErrorMessage, getApiFieldErrors } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { flattenCategories, useCategoryTree, useSupplierOptions } from "./api";
import { PlantDetailFields } from "./PlantDetailFields";
import {
  erroresPorCampo,
  numeroAApi,
  plantFormSchema,
  productFormSchema,
  textoAApi,
  type PlantFlags,
  type PlantFormValues,
  type ProductFormValues,
} from "./schemas";
import type { CreateProductBody, PlantDetailInput, ProductDetail, ProductKind } from "./types";

const PLANT_VACIA: PlantFormValues = {
  commonName: "", scientificName: "", genus: "", species: "", variety: "", cultivar: "",
  botanicalFamily: "", sizeLabel: "", heightCm: "", potSizeNumber: "", containerLiters: "",
  approxAgeMonths: "", environment: "", lightRequirement: "", wateringFrequency: "", humidity: "",
  minTempC: "", maxTempC: "", season: "", floweringSeason: "", fruitingSeason: "", growthRate: "",
  adultHeightM: "", adultDiameterM: "", soilType: "", phRange: "", difficultyLevel: "",
  careNotes: "",
};

const FLAGS_VACIOS: PlantFlags = {
  frostTolerant: null, heatResistant: null, isToxic: null, petFriendly: null, indoorSuitable: null,
};

const texto = (valor: string | null | undefined) => valor ?? "";
const numero = (valor: string | number | null | undefined) =>
  valor === null || valor === undefined ? "" : String(valor);

function valoresIniciales(producto: ProductDetail | null): ProductFormValues {
  return {
    kind: producto?.kind ?? "CONVENTIONAL",
    sku: texto(producto?.sku),
    name: texto(producto?.name),
    internalCode: texto(producto?.internalCode),
    description: texto(producto?.description),
    categoryId: producto?.categoryId != null ? String(producto.categoryId) : "",
    unit: producto?.unit ?? "unidad",
    unitsPerTray: numero(producto?.unitsPerTray),
    minStock: numero(producto?.minStock),
    optimalStock: numero(producto?.optimalStock),
    maxStock: numero(producto?.maxStock),
    mainSupplierId: producto?.mainSupplierId != null ? String(producto.mainSupplierId) : "",
    imageUrl: texto(producto?.imageUrl),
    isActive: producto?.isActive ?? true,
    isFavorite: producto?.isFavorite ?? false,
  };
}

function plantaInicial(producto: ProductDetail | null): PlantFormValues {
  const ficha = producto?.plantDetail;
  if (!ficha) return PLANT_VACIA;

  return {
    commonName: texto(ficha.commonName), scientificName: texto(ficha.scientificName),
    genus: texto(ficha.genus), species: texto(ficha.species), variety: texto(ficha.variety),
    cultivar: texto(ficha.cultivar), botanicalFamily: texto(ficha.botanicalFamily),
    sizeLabel: texto(ficha.sizeLabel), heightCm: numero(ficha.heightCm),
    potSizeNumber: numero(ficha.potSizeNumber), containerLiters: numero(ficha.containerLiters),
    approxAgeMonths: numero(ficha.approxAgeMonths), environment: texto(ficha.environment),
    lightRequirement: texto(ficha.lightRequirement),
    wateringFrequency: texto(ficha.wateringFrequency), humidity: texto(ficha.humidity),
    minTempC: numero(ficha.minTempC), maxTempC: numero(ficha.maxTempC),
    season: texto(ficha.season), floweringSeason: texto(ficha.floweringSeason),
    fruitingSeason: texto(ficha.fruitingSeason), growthRate: texto(ficha.growthRate),
    adultHeightM: numero(ficha.adultHeightM), adultDiameterM: numero(ficha.adultDiameterM),
    soilType: texto(ficha.soilType), phRange: texto(ficha.phRange),
    difficultyLevel: texto(ficha.difficultyLevel), careNotes: texto(ficha.careNotes),
  };
}

function flagsIniciales(producto: ProductDetail | null): PlantFlags {
  const ficha = producto?.plantDetail;
  if (!ficha) return FLAGS_VACIOS;
  return {
    frostTolerant: ficha.frostTolerant, heatResistant: ficha.heatResistant,
    isToxic: ficha.isToxic, petFriendly: ficha.petFriendly,
    indoorSuitable: ficha.indoorSuitable,
  };
}

/** Arma el `plantDetail` que viaja a la API a partir del formulario. */
function armarPlantDetail(
  valores: PlantFormValues,
  flags: PlantFlags
): Partial<PlantDetailInput> {
  return {
    commonName: textoAApi(valores.commonName),
    scientificName: textoAApi(valores.scientificName),
    genus: textoAApi(valores.genus),
    species: textoAApi(valores.species),
    variety: textoAApi(valores.variety),
    cultivar: textoAApi(valores.cultivar),
    botanicalFamily: textoAApi(valores.botanicalFamily),
    sizeLabel: textoAApi(valores.sizeLabel),
    heightCm: numeroAApi(valores.heightCm),
    potSizeNumber: numeroAApi(valores.potSizeNumber),
    containerLiters: numeroAApi(valores.containerLiters),
    approxAgeMonths: numeroAApi(valores.approxAgeMonths),
    environment: textoAApi(valores.environment),
    lightRequirement: textoAApi(valores.lightRequirement),
    wateringFrequency: textoAApi(valores.wateringFrequency),
    humidity: textoAApi(valores.humidity),
    minTempC: numeroAApi(valores.minTempC),
    maxTempC: numeroAApi(valores.maxTempC),
    season: textoAApi(valores.season),
    floweringSeason: textoAApi(valores.floweringSeason),
    fruitingSeason: textoAApi(valores.fruitingSeason),
    growthRate: textoAApi(valores.growthRate),
    adultHeightM: numeroAApi(valores.adultHeightM),
    adultDiameterM: numeroAApi(valores.adultDiameterM),
    soilType: textoAApi(valores.soilType),
    phRange: textoAApi(valores.phRange),
    difficultyLevel: textoAApi(valores.difficultyLevel),
    careNotes: textoAApi(valores.careNotes),
    ...flags,
  };
}

export function ProductForm({
  producto,
  guardando,
  errorServidor,
  onSubmit,
  onCancel,
}: {
  /** `null` = alta. */
  producto: ProductDetail | null;
  guardando: boolean;
  errorServidor: unknown;
  onSubmit: (body: CreateProductBody) => void;
  onCancel: () => void;
}) {
  const { can } = useAuth();
  const verCostos = can(PERMISSIONS.PRODUCTS_VIEW_COST);

  const categorias = useCategoryTree();
  const proveedores = useSupplierOptions();

  const [valores, setValores] = useState<ProductFormValues>(() => valoresIniciales(producto));
  const [planta, setPlanta] = useState<PlantFormValues>(() => plantaInicial(producto));
  const [flags, setFlags] = useState<PlantFlags>(() => flagsIniciales(producto));
  const [errores, setErrores] = useState<Record<string, string>>({});

  const esAlta = producto === null;
  const opcionesCategoria = flattenCategories(categorias.data);

  // Los errores por campo del backend (Zod) se muestran junto a los locales
  const erroresApi = getApiFieldErrors(errorServidor);
  const errorDeCampo = (campo: string) => errores[campo] ?? erroresApi[campo];

  const set = <K extends keyof ProductFormValues>(campo: K, valor: ProductFormValues[K]) =>
    setValores((previos) => ({ ...previos, [campo]: valor }));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const base = productFormSchema.safeParse(valores);
    const ficha = valores.kind === "PLANT" ? plantFormSchema.safeParse(planta) : null;

    if (!base.success || (ficha !== null && !ficha.success)) {
      setErrores({
        ...(base.success ? {} : erroresPorCampo(base.error)),
        ...(ficha === null || ficha.success ? {} : erroresPorCampo(ficha.error)),
      });
      return;
    }
    setErrores({});

    const body: CreateProductBody = {
      kind: valores.kind,
      sku: valores.sku.trim(),
      name: valores.name.trim(),
      internalCode: textoAApi(valores.internalCode),
      description: textoAApi(valores.description),
      categoryId: valores.categoryId === "" ? null : Number(valores.categoryId),
      unit: valores.unit.trim(),
      unitsPerTray: numeroAApi(valores.unitsPerTray),
      minStock: numeroAApi(valores.minStock),
      optimalStock: numeroAApi(valores.optimalStock),
      maxStock: numeroAApi(valores.maxStock),
      mainSupplierId: valores.mainSupplierId === "" ? null : Number(valores.mainSupplierId),
      imageUrl: textoAApi(valores.imageUrl),
      isActive: valores.isActive,
      isFavorite: valores.isFavorite,
      // El backend rechaza plantDetail en productos convencionales
      ...(valores.kind === "PLANT" ? { plantDetail: armarPlantDetail(planta, flags) } : {}),
    };

    onSubmit(body);
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <Card className="space-y-6">
        <CardHeader title="Datos del producto" />

        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Nombre"
            required
            autoFocus
            value={valores.name}
            onChange={(event) => set("name", event.target.value)}
            error={errorDeCampo("name")}
            className="sm:col-span-2"
          />

          <Input
            label="SKU"
            required
            value={valores.sku}
            onChange={(event) => set("sku", event.target.value)}
            error={errorDeCampo("sku")}
            hint="Único en todo el catálogo."
          />

          <Input
            label="Código interno"
            value={valores.internalCode}
            onChange={(event) => set("internalCode", event.target.value)}
            error={errorDeCampo("internalCode")}
          />

          <Select
            label="Tipo"
            value={valores.kind}
            disabled={!esAlta}
            onChange={(event) => set("kind", event.target.value as ProductKind)}
            hint={esAlta ? undefined : "El tipo no se cambia después del alta."}
          >
            <option value="CONVENTIONAL">Producto convencional</option>
            <option value="PLANT">Planta</option>
          </Select>

          <Select
            label="Categoría"
            value={valores.categoryId}
            onChange={(event) => set("categoryId", event.target.value)}
            disabled={categorias.isPending}
            error={errorDeCampo("categoryId")}
          >
            <option value="">Sin categoría</option>
            {opcionesCategoria.map((opcion) => (
              <option key={opcion.id} value={opcion.id}>
                {opcion.label}
              </option>
            ))}
          </Select>

          <Input
            label="Unidad"
            required
            value={valores.unit}
            onChange={(event) => set("unit", event.target.value)}
            error={errorDeCampo("unit")}
            hint="Ej: unidad, kg, bandeja."
          />

          <Input
            label="Unidades por bandeja"
            inputMode="decimal"
            value={valores.unitsPerTray}
            onChange={(event) => set("unitsPerTray", event.target.value)}
            error={errorDeCampo("unitsPerTray")}
          />

          <Select
            label="Proveedor principal"
            value={valores.mainSupplierId}
            onChange={(event) => set("mainSupplierId", event.target.value)}
            disabled={proveedores.isPending}
          >
            <option value="">Sin proveedor</option>
            {(proveedores.data ?? []).map((proveedor) => (
              <option key={proveedor.id} value={proveedor.id}>
                {proveedor.tradeName ?? proveedor.legalName}
              </option>
            ))}
          </Select>

          <Input
            label="Imagen (URL)"
            value={valores.imageUrl}
            onChange={(event) => set("imageUrl", event.target.value)}
            error={errorDeCampo("imageUrl")}
          />

          <Textarea
            label="Descripción"
            value={valores.description}
            onChange={(event) => set("description", event.target.value)}
            error={errorDeCampo("description")}
            className="sm:col-span-2"
          />
        </div>
      </Card>

      <Card className="space-y-6">
        <CardHeader
          title="Reposición"
          description="Sirven para el panel y para saber qué hay que reponer."
        />

        <div className="grid gap-5 sm:grid-cols-3">
          <Input
            label="Stock mínimo"
            inputMode="decimal"
            value={valores.minStock}
            onChange={(event) => set("minStock", event.target.value)}
            error={errorDeCampo("minStock")}
          />
          <Input
            label="Stock óptimo"
            inputMode="decimal"
            value={valores.optimalStock}
            onChange={(event) => set("optimalStock", event.target.value)}
            error={errorDeCampo("optimalStock")}
          />
          <Input
            label="Stock máximo"
            inputMode="decimal"
            value={valores.maxStock}
            onChange={(event) => set("maxStock", event.target.value)}
            error={errorDeCampo("maxStock")}
          />
        </div>

        <div className="flex flex-col gap-4 border-t border-stone-100 pt-6 sm:flex-row sm:gap-10">
          <Checkbox
            label="Activo"
            hint="Los inactivos no se ofrecen en el punto de venta."
            checked={valores.isActive}
            onChange={(event) => set("isActive", event.target.checked)}
          />
          <Checkbox
            label="Favorito"
            hint="Acceso rápido en el POS."
            checked={valores.isFavorite}
            onChange={(event) => set("isFavorite", event.target.checked)}
          />
        </div>
      </Card>

      {/* Costos: SOLO lectura y solo si el usuario los puede ver. El
          catálogo no los edita — se actualizan desde las recepciones. */}
      {verCostos && producto !== null && (
        <Card className="space-y-4">
          <CardHeader
            title="Costos"
            description="Se actualizan solos con cada recepción de mercadería; acá no se editan."
          />
          <dl className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-sm text-stone-500">Último costo</dt>
              <dd className="tabular text-lg font-semibold">{formatMoney(producto.lastCost)}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-stone-500">Costo promedio</dt>
              <dd className="tabular text-lg font-semibold">{formatMoney(producto.averageCost)}</dd>
            </div>
          </dl>
        </Card>
      )}

      {valores.kind === "PLANT" && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold tracking-wide text-stone-500 uppercase">
            Ficha de la planta
          </h2>
          <PlantDetailFields
            values={planta}
            flags={flags}
            errors={errores}
            onChange={(campo, valor) => setPlanta((previos) => ({ ...previos, [campo]: valor }))}
            onFlagChange={(campo, valor) => setFlags((previos) => ({ ...previos, [campo]: valor }))}
          />
        </div>
      )}

      {errorServidor !== null && errorServidor !== undefined && (
        <Alert tone="danger" title="No se pudo guardar el producto">
          {getApiErrorMessage(errorServidor)}
        </Alert>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" loading={guardando}>
          {esAlta ? "Crear producto" : "Guardar cambios"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={guardando}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
