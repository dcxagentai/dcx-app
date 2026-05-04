export type DcxAppTradeMaterialInterestOption = {
  material_key: string
  display_label: string
  sort_order: number
}

export type DcxAppGroupedTradeMaterialOption = {
  value: string
  label: string
  searchLabel: string
  groupLabel: string
  sortOrder: number
}

export type DcxAppGroupedTradeMaterialOptionGroup = {
  label: string
  items: DcxAppGroupedTradeMaterialOption[]
}

const DCX_APP_TRADE_MATERIAL_GROUP_BY_KEY: Record<string, string> = {
  aluminum: "Metals",
  copper: "Metals",
  wheat: "Agriculture",
  sugar: "Agriculture",
  coffee: "Agriculture",
  soybeans: "Agriculture",
  urea: "Fertilizers",
  crude_oil: "Energy",
  lng: "Energy",
  livestock: "Livestock",
}

const DCX_APP_TRADE_MATERIAL_GROUP_SORT_ORDER: Record<string, number> = {
  Metals: 10,
  Agriculture: 20,
  Fertilizers: 30,
  Energy: 40,
  Livestock: 50,
  Other: 1000,
}

export function readDcxAppGroupedTradeMaterialOptions(
  materialOptions: DcxAppTradeMaterialInterestOption[],
): DcxAppGroupedTradeMaterialOptionGroup[] {
  const groupedOptionsByLabel = new Map<string, DcxAppGroupedTradeMaterialOption[]>()

  for (const materialOption of materialOptions) {
    const materialKey = materialOption.material_key.trim().toLowerCase()
    if (materialKey === "") {
      continue
    }
    const groupLabel = DCX_APP_TRADE_MATERIAL_GROUP_BY_KEY[materialKey] ?? "Other"
    const option = {
      value: materialKey,
      label: materialOption.display_label,
      searchLabel: `${materialOption.display_label} ${groupLabel}`,
      groupLabel,
      sortOrder: materialOption.sort_order,
    }
    groupedOptionsByLabel.set(groupLabel, [...(groupedOptionsByLabel.get(groupLabel) ?? []), option])
  }

  return Array.from(groupedOptionsByLabel.entries())
    .map(([label, items]) => ({
      label,
      items: items.sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label)),
    }))
    .sort(
      (left, right) =>
        (DCX_APP_TRADE_MATERIAL_GROUP_SORT_ORDER[left.label] ?? 1000) -
          (DCX_APP_TRADE_MATERIAL_GROUP_SORT_ORDER[right.label] ?? 1000) ||
        left.label.localeCompare(right.label),
    )
}

export function readDcxAppFlatTradeMaterialOptions(
  optionGroups: DcxAppGroupedTradeMaterialOptionGroup[],
): DcxAppGroupedTradeMaterialOption[] {
  return optionGroups.flatMap((optionGroup) => optionGroup.items)
}
