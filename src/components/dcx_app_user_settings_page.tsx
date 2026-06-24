/**
 * CONTEXT:
 * Basic user settings page for the DCX app.
 * It carries the editable preference controls that used to live on the account
 * page so the shell can now separate identity, settings, and activity clearly.
 */
import {
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { StarIcon } from "lucide-react"

import {
  type DcxAppEditableFieldVisualState,
  DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS,
  readDcxAppEditableFieldBorderClass,
  readDcxAppEditableFieldStatusTextClass,
} from "./dcx_app_user_account_shared"
import { readDcxAppAuthenticatedUserAccountSummary } from "../lib/read_dcx_app_authenticated_user_account_summary"
import { saveDcxAppAuthenticatedUserAccountSettings } from "../lib/save_dcx_app_authenticated_user_account_settings"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "./ui/field"
import {
  Combobox,
  ComboboxChip,
  ComboboxChipRemove,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
  ComboboxTriggerIcon,
  ComboboxValue,
} from "./ui/combobox"
import { Input } from "./ui/input"
import { DcxCountryFlagIcon } from "./ui/dcx_country_flag_icon"
import { readDcxAppLanguageFlagRegionCode } from "../lib/dcx_app_language_flag_options"
import {
  readDcxAppFlatTradeMaterialOptions,
  readDcxAppGroupedTradeMaterialOptions,
  type DcxAppGroupedTradeMaterialOption,
  type DcxAppGroupedTradeMaterialOptionGroup,
} from "../lib/dcx_app_trade_material_interest_options"

type EditableFieldKey =
  | "public_display_name"
  | "public_handle"
  | "public_identity_mode"
  | "selected_languages"
  | "selected_timezones"
  | "selected_countries"
  | "email_communication_preference"
  | "default_interaction_channel"
  | "trade_interest_materials"

type EditableDraft = {
  publicDisplayName: string
  publicHandle: string
  publicIdentityMode: string
  selectedLanguageIds: number[]
  selectedTimezoneIds: number[]
  selectedCountryIds: number[]
  emailCommunicationPreference: string
  defaultInteractionChannel: string
  tradeInterestMaterialKeys: string[]
}

type EditableFieldUiState = {
  visualState: DcxAppEditableFieldVisualState
  statusText: string
}

type Props = {
  apiBaseUrl: string
}

const DCX_APP_EDITABLE_FIELD_SAVED_STATE_DURATION_MS = 10000

type EditableSelectFieldProps = {
  label: string
  uxStrings: Record<string, string>
  visualState: DcxAppEditableFieldVisualState
  statusText: string
  isDisabled: boolean
  value: string
  placeholder: string
  options: Array<{
    value: string
    label: string
    searchLabel?: string
    subtitle?: string
    regionCode?: string
    groupLabel?: string
  }>
  onBeginEditing: () => void
  onCancelEditing: () => void
  onSelectValue: (value: string) => void
}

type EditableTextFieldProps = {
  label: string
  uxStrings: Record<string, string>
  visualState: DcxAppEditableFieldVisualState
  statusText: string
  isDisabled: boolean
  value: string
  placeholder: string
  onBeginEditing: () => void
  onCancelEditing: () => void
  onChangeValue: (value: string) => void
  onCommitValue: (value: string) => void
}

type EditableTradeInterestMaterialsFieldProps = {
  label: string
  visualState: DcxAppEditableFieldVisualState
  statusText: string
  isDisabled: boolean
  selectedMaterialKeys: string[]
  optionGroups: DcxAppGroupedTradeMaterialOptionGroup[]
  onBeginEditing: () => void
  onCancelEditing: () => void
  onSelectValues: (materialKeys: string[]) => void
}

type DcxAppOrderedReferenceOption = {
  value: string
  label: string
  searchLabel: string
  subtitle: string
  groupLabel: string
  regionCode?: string
}

type DcxAppOrderedReferenceOptionGroup = {
  label: string
  items: DcxAppOrderedReferenceOption[]
}

type DcxAppAvailableLanguageOption = {
  id: number
  language_code: string
  language_name_en: string
  language_name_native: string
}

type DcxAppAvailableCountryOption = {
  id: number
  country_code_alpha2: string
  default_display_name: string
  flag_asset_key: string
}

function DcxAppEditableTextField(props: EditableTextFieldProps) {
  const triggerBorderClass = readDcxAppEditableFieldBorderClass(props.visualState)
  const hasError = props.visualState === "error"

  return (
    <Field data-invalid={hasError || undefined} className="gap-2">
      <FieldLabel className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
        {props.label}
      </FieldLabel>
      <Input
        aria-invalid={hasError || undefined}
        className={[triggerBorderClass, "bg-slate-50"].join(" ")}
        disabled={props.isDisabled}
        value={props.value}
        placeholder={props.placeholder}
        onFocus={props.onBeginEditing}
        onChange={(event) => props.onChangeValue(event.target.value)}
        onBlur={(event) => props.onCommitValue(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur()
          }
          if (event.key === "Escape") {
            props.onCancelEditing()
            event.currentTarget.blur()
          }
        }}
      />
      {hasError ? <FieldError>{props.statusText}</FieldError> : null}
    </Field>
  )
}

function DcxAppChipMainAction(props: {
  isMain: boolean
  label: string
  onMakeMain: () => void
}) {
  if (props.isMain) {
    return (
      <span
        aria-label={`${props.label} is main`}
        title="Main"
        className="inline-flex size-4 items-center justify-center rounded-sm text-amber-500"
      >
        <StarIcon className="size-3.5 fill-current" aria-hidden="true" />
      </span>
    )
  }

  function stopChipActionPointerEvent(event: PointerEvent<HTMLButtonElement>): void {
    event.preventDefault()
    event.stopPropagation()
  }

  function stopChipActionMouseEvent(event: MouseEvent<HTMLButtonElement>): void {
    event.preventDefault()
    event.stopPropagation()
  }

  function makeMain(event: MouseEvent<HTMLButtonElement>): void {
    event.preventDefault()
    event.stopPropagation()
    props.onMakeMain()
  }

  return (
    <button
      type="button"
      aria-label={`Make ${props.label} main`}
      title="Make main"
      className="inline-flex size-4 items-center justify-center rounded-sm text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-500 focus-visible:bg-amber-50 focus-visible:text-amber-500 focus-visible:outline-none"
      onPointerDown={stopChipActionPointerEvent}
      onMouseDown={stopChipActionMouseEvent}
      onClick={makeMain}
    >
      <StarIcon className="size-3.5" aria-hidden="true" />
    </button>
  )
}

function DcxAppEditableSelectField(props: EditableSelectFieldProps) {
  const triggerBorderClass = readDcxAppEditableFieldBorderClass(props.visualState)
  const hasError = props.visualState === "error"
  const selectedOption = props.options.find((option) => option.value === props.value) ?? null
  const groupedOptions = readDcxAppGroupedSelectOptions(props.options)
  const hasGroupedOptions = groupedOptions.length > 0

  return (
    <Field data-invalid={hasError || undefined} className="gap-2">
      <FieldLabel className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
        {props.label}
      </FieldLabel>
      <div className="relative">
        {selectedOption?.regionCode ? (
          <div className="pointer-events-none absolute inset-y-0 left-4 z-10 flex items-center">
            <DcxCountryFlagIcon
              regionCode={selectedOption.regionCode}
              title={selectedOption.label}
              fallbackLabel={selectedOption.regionCode}
            />
          </div>
        ) : null}
        <Combobox
          items={props.options}
          value={selectedOption ?? undefined}
          itemToStringLabel={(option) => option.label}
          itemToStringValue={(option) => option.searchLabel ?? option.label}
          isItemEqualToValue={(left, right) => left.value === right.value}
          disabled={props.isDisabled}
          onOpenChange={(isOpen) => {
            if (isOpen) {
              props.onBeginEditing()
              return
            }

            props.onCancelEditing()
          }}
          onValueChange={(nextOption) => {
            if (!nextOption) {
              return
            }
            props.onSelectValue(nextOption.value)
          }}
          autoHighlight
          openOnInputClick
        >
          <ComboboxInput
            aria-invalid={hasError || undefined}
            className={[
              selectedOption?.regionCode ? "pl-16" : "",
              "pr-10",
              triggerBorderClass,
              "bg-slate-50",
            ].join(" ")}
            placeholder={props.placeholder}
            disabled={props.isDisabled}
          />
          <ComboboxTriggerIcon />
          <ComboboxContent>
            <ComboboxEmpty>No options found.</ComboboxEmpty>
            <ComboboxList>
              {hasGroupedOptions
                ? groupedOptions.map((optionGroup) => (
                    <ComboboxGroup key={optionGroup.label} items={optionGroup.items}>
                      <ComboboxGroupLabel>{optionGroup.label}</ComboboxGroupLabel>
                      <ComboboxCollection>
                        {(option: EditableSelectFieldProps["options"][number]) => (
                          <ComboboxItem key={option.value} value={option}>
                            {option.regionCode ? (
                              <DcxCountryFlagIcon
                                regionCode={option.regionCode}
                                title={option.label}
                                fallbackLabel={option.regionCode}
                              />
                            ) : null}
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate font-medium text-slate-950">{option.label}</span>
                              {option.subtitle ? (
                                <span className="text-xs text-slate-500">{option.subtitle}</span>
                              ) : null}
                            </div>
                          </ComboboxItem>
                        )}
                      </ComboboxCollection>
                    </ComboboxGroup>
                  ))
                : (option) => (
                    <ComboboxItem key={option.value} value={option}>
                      {option.regionCode ? (
                        <DcxCountryFlagIcon
                          regionCode={option.regionCode}
                          title={option.label}
                          fallbackLabel={option.regionCode}
                        />
                      ) : null}
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-medium text-slate-950">{option.label}</span>
                        {option.subtitle ? (
                          <span className="text-xs text-slate-500">{option.subtitle}</span>
                        ) : null}
                      </div>
                    </ComboboxItem>
                  )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>
      {hasError ? <FieldError>{props.statusText}</FieldError> : null}
    </Field>
  )
}

function DcxAppEditableOrderedReferenceField(props: {
  label: string
  visualState: DcxAppEditableFieldVisualState
  statusText: string
  isDisabled: boolean
  selectedIds: number[]
  optionGroups: DcxAppOrderedReferenceOptionGroup[]
  maxSelectedCount: number
  placeholder: string
  onBeginEditing: () => void
  onCancelEditing: () => void
  onSelectValues: (selectedIds: number[]) => void
}) {
  const triggerBorderClass = readDcxAppEditableFieldBorderClass(props.visualState)
  const hasError = props.visualState === "error"
  const flatOptions = props.optionGroups.flatMap((optionGroup) => optionGroup.items)
  const selectedOptions = props.selectedIds
    .map((selectedId) => flatOptions.find((option) => option.value === String(selectedId)))
    .filter((option): option is DcxAppOrderedReferenceOption => Boolean(option))
  const selectedValueSet = new Set(selectedOptions.map((selectedOption) => selectedOption.value))
  const isSelectionFull = selectedOptions.length >= props.maxSelectedCount
  const mainSelectedOptionValue = selectedOptions[0]?.value ?? null

  function promoteSelectedOption(optionValue: string): void {
    const promotedId = Number(optionValue)
    if (!Number.isInteger(promotedId) || promotedId <= 0) {
      return
    }

    props.onSelectValues([
      promotedId,
      ...props.selectedIds.filter((selectedId) => selectedId !== promotedId),
    ])
  }

  return (
    <Field data-invalid={hasError || undefined} className="gap-2">
      <FieldLabel className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
        {props.label}
      </FieldLabel>
      <Combobox
        multiple
        items={props.optionGroups}
        value={selectedOptions}
        itemToStringLabel={(option) => option.label}
        itemToStringValue={(option) => option.searchLabel}
        isItemEqualToValue={(left, right) => left.value === right.value}
        disabled={props.isDisabled}
        onOpenChange={(isOpen) => {
          if (isOpen) {
            props.onBeginEditing()
            return
          }
          props.onCancelEditing()
        }}
        onValueChange={(nextOptions) => {
          props.onSelectValues(nextOptions.slice(0, props.maxSelectedCount).map((option) => Number(option.value)))
        }}
        autoHighlight
        openOnInputClick
      >
        <ComboboxInputGroup className={[triggerBorderClass, "bg-slate-50"].join(" ")}>
          <ComboboxChips>
            <ComboboxValue placeholder={props.placeholder}>
              {(selectedValue) => {
                const selectedChipOptions = Array.isArray(selectedValue) ? selectedValue : []
                return (
                  <>
                  {selectedChipOptions.map((selectedOption) => (
                    <ComboboxChip key={selectedOption.value}>
                      {selectedOption.regionCode ? (
                        <DcxCountryFlagIcon
                          regionCode={selectedOption.regionCode}
                          title={selectedOption.label}
                          fallbackLabel={selectedOption.regionCode}
                          className="h-4 w-6"
                        />
                      ) : null}
                      <span className="max-w-40 truncate">{selectedOption.label}</span>
                      <DcxAppChipMainAction
                        isMain={selectedOption.value === mainSelectedOptionValue}
                        label={selectedOption.label}
                        onMakeMain={() => promoteSelectedOption(selectedOption.value)}
                      />
                      <ComboboxChipRemove aria-label={`Remove ${selectedOption.label}`} />
                    </ComboboxChip>
                  ))}
                  </>
                )
              }}
            </ComboboxValue>
            <ComboboxChipsInput
              aria-invalid={hasError || undefined}
              placeholder={selectedOptions.length === 0 ? props.placeholder : ""}
              disabled={props.isDisabled}
            />
          </ComboboxChips>
          <ComboboxTriggerIcon />
        </ComboboxInputGroup>
        <ComboboxContent>
          <ComboboxEmpty>No options found.</ComboboxEmpty>
          <ComboboxList>
            {(optionGroup: DcxAppOrderedReferenceOptionGroup) => (
              <ComboboxGroup key={optionGroup.label} items={optionGroup.items}>
                <ComboboxGroupLabel>{optionGroup.label}</ComboboxGroupLabel>
                <ComboboxCollection>
                  {(option: DcxAppOrderedReferenceOption) => (
                    <ComboboxItem
                      key={option.value}
                      value={option}
                      disabled={isSelectionFull && !selectedValueSet.has(option.value)}
                    >
                      {option.regionCode ? (
                        <DcxCountryFlagIcon
                          regionCode={option.regionCode}
                          title={option.label}
                          fallbackLabel={option.regionCode}
                        />
                      ) : null}
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-medium text-slate-950">{option.label}</span>
                        <span className="text-xs text-slate-500">{option.subtitle}</span>
                      </div>
                    </ComboboxItem>
                  )}
                </ComboboxCollection>
              </ComboboxGroup>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {hasError ? <FieldError>{props.statusText}</FieldError> : null}
    </Field>
  )
}

function DcxAppEditableTradeInterestMaterialsField(props: EditableTradeInterestMaterialsFieldProps) {
  const triggerBorderClass = readDcxAppEditableFieldBorderClass(props.visualState)
  const hasError = props.visualState === "error"
  const flatOptions = readDcxAppFlatTradeMaterialOptions(props.optionGroups)
  const selectedOptions = props.selectedMaterialKeys
    .map((materialKey) => flatOptions.find((option) => option.value === materialKey))
    .filter((option): option is DcxAppGroupedTradeMaterialOption => Boolean(option))
  const mainSelectedMaterialKey = selectedOptions[0]?.value ?? null

  function promoteSelectedMaterial(materialKey: string): void {
    props.onSelectValues([
      materialKey,
      ...props.selectedMaterialKeys.filter((selectedMaterialKey) => selectedMaterialKey !== materialKey),
    ])
  }

  return (
    <Field data-invalid={hasError || undefined} className="gap-2">
      <FieldLabel className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
        {props.label}
      </FieldLabel>
      <Combobox
        multiple
        items={props.optionGroups}
        value={selectedOptions}
        itemToStringLabel={(option) => option.label}
        itemToStringValue={(option) => option.searchLabel}
        isItemEqualToValue={(left, right) => left.value === right.value}
        disabled={props.isDisabled}
        onOpenChange={(isOpen) => {
          if (isOpen) {
            props.onBeginEditing()
            return
          }
          props.onCancelEditing()
        }}
        onValueChange={(nextOptions) => {
          props.onSelectValues(nextOptions.map((option) => option.value))
        }}
        autoHighlight
        openOnInputClick
      >
        <ComboboxInputGroup className={[triggerBorderClass, "bg-slate-50"].join(" ")}>
          <ComboboxChips>
            <ComboboxValue placeholder="Select commodities">
              {(selectedValue) => {
                const selectedChipOptions = Array.isArray(selectedValue) ? selectedValue : []
                return (
                  <>
                  {selectedChipOptions.map((selectedOption) => (
                    <ComboboxChip key={selectedOption.value}>
                      <span className="max-w-36 truncate">{selectedOption.label}</span>
                      <DcxAppChipMainAction
                        isMain={selectedOption.value === mainSelectedMaterialKey}
                        label={selectedOption.label}
                        onMakeMain={() => promoteSelectedMaterial(selectedOption.value)}
                      />
                      <ComboboxChipRemove aria-label={`Remove ${selectedOption.label}`} />
                    </ComboboxChip>
                  ))}
                  </>
                )
              }}
            </ComboboxValue>
            <ComboboxChipsInput
              aria-invalid={hasError || undefined}
              placeholder={selectedOptions.length === 0 ? "Select commodities" : ""}
              disabled={props.isDisabled}
            />
          </ComboboxChips>
          <ComboboxTriggerIcon />
        </ComboboxInputGroup>
        <ComboboxContent>
          <ComboboxEmpty>No options found.</ComboboxEmpty>
          <ComboboxList>
            {(optionGroup: DcxAppGroupedTradeMaterialOptionGroup) => (
              <ComboboxGroup key={optionGroup.label} items={optionGroup.items}>
                <ComboboxGroupLabel>{optionGroup.label}</ComboboxGroupLabel>
                <ComboboxCollection>
                  {(option: DcxAppGroupedTradeMaterialOption) => (
                    <ComboboxItem key={option.value} value={option}>
                      <span className="truncate font-medium text-slate-950">{option.label}</span>
                    </ComboboxItem>
                  )}
                </ComboboxCollection>
              </ComboboxGroup>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {hasError ? <FieldError>{props.statusText}</FieldError> : null}
    </Field>
  )
}

export function DcxAppUserSettingsPage(props: Props) {
  const queryClient = useQueryClient()
  const resetStatusTimeoutByFieldRef = useRef<
    Partial<Record<EditableFieldKey, ReturnType<typeof setTimeout>>>
  >({})
  const autoInitializedLanguageByUserIdRef = useRef<Record<number, boolean>>({})

  const accountSummaryQuery = useQuery({
    queryKey: ["dcx_app_authenticated_user_account_summary"],
    queryFn: async () =>
      readDcxAppAuthenticatedUserAccountSummary({
        apiBaseUrl: props.apiBaseUrl,
      }),
  })

  const saveAccountSettingsMutation = useMutation({
    mutationFn: async (nextDraft: EditableDraft) =>
      saveDcxAppAuthenticatedUserAccountSettings({
        apiBaseUrl: props.apiBaseUrl,
        preferredLanguageId: nextDraft.selectedLanguageIds[0] ?? null,
        preferredTimezoneId: nextDraft.selectedTimezoneIds[0] ?? null,
        emailCommunicationPreference: nextDraft.emailCommunicationPreference,
        publicDisplayName: nextDraft.publicDisplayName,
        publicHandle: nextDraft.publicHandle,
        publicIdentityMode: nextDraft.publicIdentityMode,
        defaultInteractionChannel: nextDraft.defaultInteractionChannel,
        tradeInterestMaterialKeys: nextDraft.tradeInterestMaterialKeys,
        sidebarClockTimezoneIds: nextDraft.selectedTimezoneIds.slice(1, 3),
        selectedLanguageIds: nextDraft.selectedLanguageIds,
        selectedTimezoneIds: nextDraft.selectedTimezoneIds,
        selectedCountryIds: nextDraft.selectedCountryIds,
      }),
  })

  const accountSummary = accountSummaryQuery.data?.data ?? null
  const ux = accountSummary?.ux_strings ?? DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS
  const tradeInterestMaterialOptionGroups = readDcxAppGroupedTradeMaterialOptions(
    accountSummary?.available_trade_interest_materials ?? [],
  )
  const timezoneOptionGroups = readDcxAppGroupedTimezoneOptions(
    accountSummary?.available_timezones ?? [],
  )
  const languageOptionGroups = readDcxAppGroupedLanguageOptions(
    accountSummary?.available_languages ?? [],
  )
  const countryOptionGroups = readDcxAppGroupedCountryOptions(
    accountSummary?.available_countries ?? [],
  )
  const [editableDraft, setEditableDraft] = useState<EditableDraft>({
    publicDisplayName: "",
    publicHandle: "",
    publicIdentityMode: "display_name",
    selectedLanguageIds: [],
    selectedTimezoneIds: [],
    selectedCountryIds: [],
    emailCommunicationPreference: "newsletters",
    defaultInteractionChannel: "app_only",
    tradeInterestMaterialKeys: [],
  })
  const [editableFieldUiStateByKey, setEditableFieldUiStateByKey] = useState<
    Record<EditableFieldKey, EditableFieldUiState>
  >({
    public_display_name: {
      visualState: "idle",
      statusText: DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS.editable_status_idle,
    },
    public_handle: {
      visualState: "idle",
      statusText: DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS.editable_status_idle,
    },
    public_identity_mode: {
      visualState: "idle",
      statusText: DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS.editable_status_idle,
    },
    selected_languages: {
      visualState: "idle",
      statusText: DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS.editable_status_idle,
    },
    selected_timezones: {
      visualState: "idle",
      statusText: DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS.editable_status_idle,
    },
    selected_countries: {
      visualState: "idle",
      statusText: DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS.editable_status_idle,
    },
    email_communication_preference: {
      visualState: "idle",
      statusText: DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS.editable_status_idle,
    },
    default_interaction_channel: {
      visualState: "idle",
      statusText: DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS.editable_status_idle,
    },
    trade_interest_materials: {
      visualState: "idle",
      statusText: DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS.editable_status_idle,
    },
  })

  useEffect(() => {
    if (!accountSummary) {
      return
    }

    setEditableDraft({
      publicDisplayName: accountSummary.public_identity.public_display_name,
      publicHandle: accountSummary.public_identity.public_handle,
      publicIdentityMode: accountSummary.public_identity.public_identity_mode,
      selectedLanguageIds: accountSummary.selected_language_ids,
      selectedTimezoneIds: accountSummary.selected_timezone_ids,
      selectedCountryIds: accountSummary.selected_country_ids,
      emailCommunicationPreference: accountSummary.email_communication_preference,
      defaultInteractionChannel: accountSummary.default_interaction_channel,
      tradeInterestMaterialKeys: accountSummary.selected_trade_interest_material_keys,
    })
  }, [accountSummary])

  useEffect(() => {
    if (!accountSummary) {
      return
    }

    if (accountSummary.selected_language_ids.length > 0) {
      return
    }

    if (autoInitializedLanguageByUserIdRef.current[accountSummary.user_id]) {
      return
    }

    const defaultLanguage = accountSummary.available_languages[0] ?? null
    if (!defaultLanguage) {
      return
    }

    autoInitializedLanguageByUserIdRef.current[accountSummary.user_id] = true

    const nextDraft = {
      publicDisplayName: editableDraft.publicDisplayName,
      publicHandle: editableDraft.publicHandle,
      publicIdentityMode: editableDraft.publicIdentityMode,
      selectedLanguageIds: [defaultLanguage.id],
      selectedTimezoneIds: editableDraft.selectedTimezoneIds,
      selectedCountryIds: editableDraft.selectedCountryIds,
      emailCommunicationPreference: editableDraft.emailCommunicationPreference,
      defaultInteractionChannel: editableDraft.defaultInteractionChannel,
      tradeInterestMaterialKeys: editableDraft.tradeInterestMaterialKeys,
    }

    setEditableDraft(nextDraft)
    setEditableFieldUiStateByKey((previousState) => ({
      ...previousState,
      selected_languages: {
        visualState: "saving",
        statusText: ux.editable_status_saving_default_language,
      },
    }))
    void saveEditableDraftWithRetries("selected_languages", nextDraft)
  }, [
    accountSummary,
    editableDraft.emailCommunicationPreference,
    editableDraft.defaultInteractionChannel,
    editableDraft.publicDisplayName,
    editableDraft.publicHandle,
    editableDraft.publicIdentityMode,
    editableDraft.selectedCountryIds,
    editableDraft.selectedTimezoneIds,
    editableDraft.tradeInterestMaterialKeys,
    ux.editable_status_saving_default_language,
  ])

  useEffect(() => {
    return () => {
      for (const timeoutHandle of Object.values(resetStatusTimeoutByFieldRef.current)) {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle)
        }
      }
    }
  }, [])

  async function saveEditableDraftWithRetries(
    fieldKey: EditableFieldKey,
    nextDraft: EditableDraft,
  ): Promise<void> {
    for (let attemptNumber = 1; attemptNumber <= 3; attemptNumber += 1) {
      try {
        const savePayload = await saveAccountSettingsMutation.mutateAsync(nextDraft)
        queryClient.setQueryData(["dcx_app_authenticated_user_account_summary"], savePayload)
        setEditableDraft({
          publicDisplayName: savePayload.data.public_identity.public_display_name,
          publicHandle: savePayload.data.public_identity.public_handle,
          publicIdentityMode: savePayload.data.public_identity.public_identity_mode,
          selectedLanguageIds: savePayload.data.selected_language_ids,
          selectedTimezoneIds: savePayload.data.selected_timezone_ids,
          selectedCountryIds: savePayload.data.selected_country_ids,
          emailCommunicationPreference: savePayload.data.email_communication_preference,
          defaultInteractionChannel: savePayload.data.default_interaction_channel,
          tradeInterestMaterialKeys: savePayload.data.selected_trade_interest_material_keys,
        })
        setEditableFieldUiStateByKey((previousState) => ({
          ...previousState,
          [fieldKey]: {
            visualState: "saved",
            statusText: ux.editable_status_saved,
          },
        }))

        if (resetStatusTimeoutByFieldRef.current[fieldKey]) {
          clearTimeout(resetStatusTimeoutByFieldRef.current[fieldKey])
        }

        resetStatusTimeoutByFieldRef.current[fieldKey] = setTimeout(() => {
          setEditableFieldUiStateByKey((previousState) => ({
            ...previousState,
            [fieldKey]: {
              visualState: "idle",
              statusText: ux.editable_status_idle,
            },
          }))
        }, DCX_APP_EDITABLE_FIELD_SAVED_STATE_DURATION_MS)

        return
      } catch (error) {
        if (attemptNumber < 3) {
          setEditableFieldUiStateByKey((previousState) => ({
            ...previousState,
            [fieldKey]: {
              visualState: "saving",
              statusText: ux.editable_status_retrying_template
                .replace("{attempt}", String(attemptNumber + 1))
                .replace("{total}", "3"),
            },
          }))
          await new Promise((resolve) => setTimeout(resolve, 700 * attemptNumber))
          continue
        }

        const saveError = error as Error & { suggested_action?: string }
        setEditableFieldUiStateByKey((previousState) => ({
          ...previousState,
          [fieldKey]: {
            visualState: "error",
            statusText: saveError.suggested_action ?? ux.editable_status_save_failed,
          },
        }))
        return
      }
    }
  }

  function beginEditingField(fieldKey: EditableFieldKey): void {
    if (saveAccountSettingsMutation.isPending) {
      return
    }

    setEditableFieldUiStateByKey((previousState) => ({
      ...previousState,
      [fieldKey]: {
        visualState: "editing",
        statusText: ux.editable_status_editing,
      },
    }))
  }

  function cancelEditingField(fieldKey: EditableFieldKey): void {
    if (saveAccountSettingsMutation.isPending) {
      return
    }

    setEditableFieldUiStateByKey((previousState) => ({
      ...previousState,
      [fieldKey]: {
        visualState: "idle",
        statusText: ux.editable_status_idle,
      },
    }))
  }

  const editableControlsDisabled = saveAccountSettingsMutation.isPending
  const settingsSaveStatus = readDcxAppSettingsPageSaveStatus({
    editableFieldUiStateByKey,
    uxStrings: ux,
  })

  function setTradeInterestMaterialKeys(materialKeys: string[]): void {
    const nextMaterialKeys = Array.from(new Set(materialKeys.map((materialKey) => materialKey.trim().toLowerCase())))
    const nextDraft = {
      ...editableDraft,
      tradeInterestMaterialKeys: nextMaterialKeys,
    }
    setEditableDraft(nextDraft)
    setEditableFieldUiStateByKey((previousState) => ({
      ...previousState,
      trade_interest_materials: {
        visualState: "saving",
        statusText: ux.editable_status_saving,
      },
    }))
    void saveEditableDraftWithRetries("trade_interest_materials", nextDraft)
  }

  function setSelectedLanguageIds(languageIds: number[]): void {
    const nextLanguageIds = readDcxAppNormalizedSelectedIds(languageIds, 5)
    const nextDraft = {
      ...editableDraft,
      selectedLanguageIds: nextLanguageIds,
    }
    setEditableDraft(nextDraft)
    setEditableFieldUiStateByKey((previousState) => ({
      ...previousState,
      selected_languages: {
        visualState: "saving",
        statusText: ux.editable_status_saving,
      },
    }))
    void saveEditableDraftWithRetries("selected_languages", nextDraft)
  }

  function setSelectedTimezoneIds(timezoneIds: number[]): void {
    const nextTimezoneIds = readDcxAppNormalizedSelectedIds(timezoneIds, 3)
    const nextDraft = {
      ...editableDraft,
      selectedTimezoneIds: nextTimezoneIds,
    }
    setEditableDraft(nextDraft)
    setEditableFieldUiStateByKey((previousState) => ({
      ...previousState,
      selected_timezones: {
        visualState: "saving",
        statusText: ux.editable_status_saving,
      },
    }))
    void saveEditableDraftWithRetries("selected_timezones", nextDraft)
  }

  function setSelectedCountryIds(countryIds: number[]): void {
    const nextCountryIds = readDcxAppNormalizedSelectedIds(countryIds, 25)
    const nextDraft = {
      ...editableDraft,
      selectedCountryIds: nextCountryIds,
    }
    setEditableDraft(nextDraft)
    setEditableFieldUiStateByKey((previousState) => ({
      ...previousState,
      selected_countries: {
        visualState: "saving",
        statusText: ux.editable_status_saving,
      },
    }))
    void saveEditableDraftWithRetries("selected_countries", nextDraft)
  }

  return (
    <section className="flex flex-col gap-6 text-slate-950">
      {accountSummaryQuery.isLoading ? (
        <section className="rounded-none border border-black/6 bg-white px-6 py-8 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
          <p className="text-sm text-slate-500">{ux.loading_account_summary}</p>
        </section>
      ) : null}

      {accountSummaryQuery.isError ? (
        <section className="rounded-none border border-red-200 bg-white px-6 py-8 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
              {ux.error_account_read_blocked}
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              {ux.error_account_load_title}
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              {(accountSummaryQuery.error as Error & { suggested_action?: string }).message}
            </p>
          </div>
        </section>
      ) : null}

      {accountSummary && !accountSummaryQuery.isError ? (
        <article className="rounded-none border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
          <div className="mb-6 space-y-2 border-b border-black/6 pb-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {ux.settings_eyebrow}
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  {ux.settings_title}
                </h2>
                <p className="text-sm text-slate-600">
                  {ux.settings_subtitle}
                </p>
              </div>
              <div className="rounded-md border border-slate-200 px-3 py-2 text-right">
                <p className={["text-xs font-medium", settingsSaveStatus.textClassName].join(" ")}>
                  {settingsSaveStatus.label}
                </p>
              </div>
            </div>
          </div>

          <FieldSet>
            <FieldLegend className="sr-only">{ux.settings_title}</FieldLegend>
            <FieldGroup className="gap-6">
              <div className="grid gap-6 lg:grid-cols-3">
                <DcxAppEditableTextField
                  uxStrings={ux}
                  label={ux.field_public_display_name ?? "Name"}
                  visualState={editableFieldUiStateByKey.public_display_name.visualState}
                  statusText={editableFieldUiStateByKey.public_display_name.statusText}
                  isDisabled={editableControlsDisabled}
                  value={editableDraft.publicDisplayName}
                  placeholder={ux.field_public_display_name_placeholder ?? "Name shown on public forum posts"}
                  onBeginEditing={() => beginEditingField("public_display_name")}
                  onCancelEditing={() => cancelEditingField("public_display_name")}
                  onChangeValue={(nextValue) => {
                    setEditableDraft((previousDraft) => ({
                      ...previousDraft,
                      publicDisplayName: nextValue,
                    }))
                    beginEditingField("public_display_name")
                  }}
                  onCommitValue={(committedValue) => {
                    const nextDraft = {
                      ...editableDraft,
                      publicDisplayName: committedValue.trim(),
                    }
                    setEditableDraft(nextDraft)
                    setEditableFieldUiStateByKey((previousState) => ({
                      ...previousState,
                      public_display_name: {
                        visualState: "saving",
                        statusText: ux.editable_status_saving,
                      },
                    }))
                    void saveEditableDraftWithRetries("public_display_name", nextDraft)
                  }}
                />
                <DcxAppEditableTextField
                  uxStrings={ux}
                  label={ux.field_public_handle ?? "Nickname"}
                  visualState={editableFieldUiStateByKey.public_handle.visualState}
                  statusText={editableFieldUiStateByKey.public_handle.statusText}
                  isDisabled={editableControlsDisabled}
                  value={editableDraft.publicHandle}
                  placeholder={ux.field_public_handle_placeholder ?? "trader_handle"}
                  onBeginEditing={() => beginEditingField("public_handle")}
                  onCancelEditing={() => cancelEditingField("public_handle")}
                  onChangeValue={(nextValue) => {
                    setEditableDraft((previousDraft) => ({
                      ...previousDraft,
                      publicHandle: nextValue,
                    }))
                    beginEditingField("public_handle")
                  }}
                  onCommitValue={(committedValue) => {
                    const nextDraft = {
                      ...editableDraft,
                      publicHandle: committedValue.trim().replace(/^@/, ""),
                    }
                    setEditableDraft(nextDraft)
                    setEditableFieldUiStateByKey((previousState) => ({
                      ...previousState,
                      public_handle: {
                        visualState: "saving",
                        statusText: ux.editable_status_saving,
                      },
                    }))
                    void saveEditableDraftWithRetries("public_handle", nextDraft)
                  }}
                />
                <DcxAppEditableSelectField
                  uxStrings={ux}
                  label={ux.field_public_identity_mode ?? "Public identity"}
                  visualState={editableFieldUiStateByKey.public_identity_mode.visualState}
                  statusText={editableFieldUiStateByKey.public_identity_mode.statusText}
                  isDisabled={editableControlsDisabled}
                  value={editableDraft.publicIdentityMode}
                  placeholder={ux.field_public_identity_mode ?? "Public identity"}
                  options={accountSummary.available_public_identity_modes
                    .filter((availableMode) => availableMode.value !== "anonymous")
                    .map((availableMode) => ({
                      value: availableMode.value,
                      label:
                        availableMode.value === "display_name"
                          ? "Name"
                          : availableMode.value === "handle"
                            ? "Nickname"
                            : availableMode.label,
                      searchLabel: availableMode.label,
                    }))}
                  onBeginEditing={() => beginEditingField("public_identity_mode")}
                  onCancelEditing={() => cancelEditingField("public_identity_mode")}
                  onSelectValue={(selectedValue) => {
                    const nextDraft = {
                      ...editableDraft,
                      publicIdentityMode: selectedValue,
                    }
                    setEditableDraft(nextDraft)
                    setEditableFieldUiStateByKey((previousState) => ({
                      ...previousState,
                      public_identity_mode: {
                        visualState: "saving",
                        statusText: ux.editable_status_saving,
                      },
                    }))
                    void saveEditableDraftWithRetries("public_identity_mode", nextDraft)
                  }}
                />
              </div>
              <DcxAppEditableOrderedReferenceField
                label="Languages"
                visualState={editableFieldUiStateByKey.selected_languages.visualState}
                statusText={editableFieldUiStateByKey.selected_languages.statusText}
                isDisabled={editableControlsDisabled}
                selectedIds={editableDraft.selectedLanguageIds}
                optionGroups={languageOptionGroups}
                maxSelectedCount={5}
                placeholder="Languages"
                onBeginEditing={() => beginEditingField("selected_languages")}
                onCancelEditing={() => cancelEditingField("selected_languages")}
                onSelectValues={(nextLanguageIds) => setSelectedLanguageIds(nextLanguageIds)}
              />
              <DcxAppEditableOrderedReferenceField
                label="Timezones"
                visualState={editableFieldUiStateByKey.selected_timezones.visualState}
                statusText={editableFieldUiStateByKey.selected_timezones.statusText}
                isDisabled={editableControlsDisabled}
                selectedIds={editableDraft.selectedTimezoneIds}
                optionGroups={timezoneOptionGroups}
                maxSelectedCount={3}
                placeholder="Timezones"
                onBeginEditing={() => beginEditingField("selected_timezones")}
                onCancelEditing={() => cancelEditingField("selected_timezones")}
                onSelectValues={(nextTimezoneIds) => setSelectedTimezoneIds(nextTimezoneIds)}
              />
              <DcxAppEditableOrderedReferenceField
                label={ux.field_countries ?? "Countries"}
                visualState={editableFieldUiStateByKey.selected_countries.visualState}
                statusText={editableFieldUiStateByKey.selected_countries.statusText}
                isDisabled={editableControlsDisabled}
                selectedIds={editableDraft.selectedCountryIds}
                optionGroups={countryOptionGroups}
                maxSelectedCount={25}
                placeholder={ux.field_countries ?? "Countries"}
                onBeginEditing={() => beginEditingField("selected_countries")}
                onCancelEditing={() => cancelEditingField("selected_countries")}
                onSelectValues={(nextCountryIds) => setSelectedCountryIds(nextCountryIds)}
              />
              <DcxAppEditableTradeInterestMaterialsField
                label="Commodities"
                visualState={editableFieldUiStateByKey.trade_interest_materials.visualState}
                statusText={editableFieldUiStateByKey.trade_interest_materials.statusText}
                isDisabled={editableControlsDisabled}
                selectedMaterialKeys={editableDraft.tradeInterestMaterialKeys}
                optionGroups={tradeInterestMaterialOptionGroups}
                onBeginEditing={() => beginEditingField("trade_interest_materials")}
                onCancelEditing={() => cancelEditingField("trade_interest_materials")}
                onSelectValues={(nextMaterialKeys) => setTradeInterestMaterialKeys(nextMaterialKeys)}
              />
              <DcxAppEditableSelectField
              uxStrings={ux}
              label={ux.field_email_preference}
              visualState={editableFieldUiStateByKey.email_communication_preference.visualState}
              statusText={editableFieldUiStateByKey.email_communication_preference.statusText}
              isDisabled={editableControlsDisabled}
              value={editableDraft.emailCommunicationPreference}
              placeholder={ux.field_email_preference}
              options={accountSummary.available_email_communication_preferences.map((availablePreference) => ({
                value: availablePreference.value,
                label: availablePreference.label,
                searchLabel: availablePreference.label,
              }))}
              onBeginEditing={() => beginEditingField("email_communication_preference")}
              onCancelEditing={() => cancelEditingField("email_communication_preference")}
              onSelectValue={(selectedValue) => {
                const nextDraft = {
                  ...editableDraft,
                  emailCommunicationPreference: selectedValue,
                }
                setEditableDraft(nextDraft)
                setEditableFieldUiStateByKey((previousState) => ({
                  ...previousState,
                  email_communication_preference: {
                    visualState: "saving",
                    statusText: ux.editable_status_saving,
                  },
                }))
                void saveEditableDraftWithRetries("email_communication_preference", nextDraft)
              }}
            />
              <DcxAppEditableSelectField
              uxStrings={ux}
              label="Trade chat notifications"
              visualState={editableFieldUiStateByKey.default_interaction_channel.visualState}
              statusText={editableFieldUiStateByKey.default_interaction_channel.statusText}
              isDisabled={editableControlsDisabled}
              value={editableDraft.defaultInteractionChannel}
              placeholder="Trade chat notifications"
              options={accountSummary.available_default_interaction_channels.map((availableChannel) => ({
                value: availableChannel.value,
                label: availableChannel.label,
                searchLabel: availableChannel.label,
              }))}
              onBeginEditing={() => beginEditingField("default_interaction_channel")}
              onCancelEditing={() => cancelEditingField("default_interaction_channel")}
              onSelectValue={(selectedValue) => {
                const nextDraft = {
                  ...editableDraft,
                  defaultInteractionChannel: selectedValue,
                }
                setEditableDraft(nextDraft)
                setEditableFieldUiStateByKey((previousState) => ({
                  ...previousState,
                  default_interaction_channel: {
                    visualState: "saving",
                    statusText: ux.editable_status_saving,
                  },
                }))
                void saveEditableDraftWithRetries("default_interaction_channel", nextDraft)
              }}
            />
            </FieldGroup>
          </FieldSet>
        </article>
      ) : null}
    </section>
  )
}

function readDcxAppSettingsPageSaveStatus(params: {
  editableFieldUiStateByKey: Record<EditableFieldKey, EditableFieldUiState>
  uxStrings: Record<string, string>
}): {
  label: string
  textClassName: string
} {
  const visualStates = Object.values(params.editableFieldUiStateByKey).map((fieldState) => fieldState.visualState)

  if (visualStates.includes("error")) {
    return {
      label: params.uxStrings.editable_status_compact_save_failed,
      textClassName: readDcxAppEditableFieldStatusTextClass("error"),
    }
  }

  if (visualStates.includes("saving")) {
    return {
      label: params.uxStrings.editable_status_saving,
      textClassName: readDcxAppEditableFieldStatusTextClass("saving"),
    }
  }

  if (visualStates.includes("editing")) {
    return {
      label: params.uxStrings.editable_status_compact_changed_unsaved,
      textClassName: readDcxAppEditableFieldStatusTextClass("editing"),
    }
  }

  if (visualStates.includes("saved")) {
    return {
      label: params.uxStrings.editable_status_compact_saved,
      textClassName: readDcxAppEditableFieldStatusTextClass("saved"),
    }
  }

  return {
    label: params.uxStrings.editable_status_compact_idle,
    textClassName: readDcxAppEditableFieldStatusTextClass("idle"),
  }
}

function readDcxAppGroupedSelectOptions(
  options: EditableSelectFieldProps["options"],
): Array<{
  label: string
  items: EditableSelectFieldProps["options"]
}> {
  const groupedOptionsByLabel = new Map<string, EditableSelectFieldProps["options"]>()
  for (const option of options) {
    if (!option.groupLabel) {
      continue
    }
    const existingOptions = groupedOptionsByLabel.get(option.groupLabel) ?? []
    existingOptions.push(option)
    groupedOptionsByLabel.set(option.groupLabel, existingOptions)
  }

  if (groupedOptionsByLabel.size === 0) {
    return []
  }

  return Array.from(groupedOptionsByLabel.entries()).map(([label, items]) => ({
    label,
    items,
  }))
}

function readDcxAppGroupedLanguageOptions(
  availableLanguages: DcxAppAvailableLanguageOption[],
): DcxAppOrderedReferenceOptionGroup[] {
  const languageOptions = [...availableLanguages]
    .sort((leftLanguage, rightLanguage) => {
      const nameComparison = leftLanguage.language_name_en.localeCompare(
        rightLanguage.language_name_en,
        undefined,
        { sensitivity: "base" },
      )

      if (nameComparison !== 0) {
        return nameComparison
      }

      return leftLanguage.language_code.localeCompare(rightLanguage.language_code)
    })
    .map((availableLanguage) => ({
      value: String(availableLanguage.id),
      label: `${availableLanguage.language_name_native} (${availableLanguage.language_code})`,
      subtitle: `${availableLanguage.language_code.toUpperCase()} · ${availableLanguage.language_name_native}`,
      searchLabel: `${availableLanguage.language_name_en} ${availableLanguage.language_name_native} ${availableLanguage.language_code}`,
      groupLabel: "Languages",
      regionCode: readDcxAppLanguageFlagRegionCode(availableLanguage.language_code),
    }))

  return [
    {
      label: "Languages",
      items: languageOptions,
    },
  ]
}

function readDcxAppGroupedTimezoneOptions(
  availableTimezones: Array<{
    id: number
    iana_name: string
    display_label: string
    region_label: string
    country_code_alpha2?: string | null
    country_display_name?: string | null
    flag_asset_key?: string | null
  }>,
): DcxAppOrderedReferenceOptionGroup[] {
  const groupedTimezoneOptionsByRegion = new Map<string, DcxAppOrderedReferenceOption[]>()
  for (const availableTimezone of availableTimezones) {
    const groupLabel = availableTimezone.region_label || "Other"
    const existingOptions = groupedTimezoneOptionsByRegion.get(groupLabel) ?? []
    existingOptions.push({
      value: String(availableTimezone.id),
      label: availableTimezone.display_label,
      subtitle: availableTimezone.iana_name,
      groupLabel,
      searchLabel: [
        availableTimezone.display_label,
        availableTimezone.iana_name,
        groupLabel,
        availableTimezone.country_display_name,
        availableTimezone.country_code_alpha2,
      ]
        .filter((searchPart): searchPart is string => typeof searchPart === "string" && searchPart.trim() !== "")
        .join(" "),
      regionCode: availableTimezone.flag_asset_key ?? availableTimezone.country_code_alpha2 ?? undefined,
    })
    groupedTimezoneOptionsByRegion.set(groupLabel, existingOptions)
  }

  return Array.from(groupedTimezoneOptionsByRegion.entries()).map(([label, items]) => ({
    label,
    items,
  }))
}

function readDcxAppGroupedCountryOptions(
  availableCountries: DcxAppAvailableCountryOption[],
): DcxAppOrderedReferenceOptionGroup[] {
  const countryOptions = [...availableCountries]
    .sort((leftCountry, rightCountry) => {
      const nameComparison = leftCountry.default_display_name.localeCompare(
        rightCountry.default_display_name,
        undefined,
        { sensitivity: "base" },
      )

      if (nameComparison !== 0) {
        return nameComparison
      }

      return leftCountry.country_code_alpha2.localeCompare(rightCountry.country_code_alpha2)
    })
    .map((availableCountry) => ({
      value: String(availableCountry.id),
      label: availableCountry.default_display_name,
      subtitle: availableCountry.country_code_alpha2,
      groupLabel: "Countries",
      searchLabel: `${availableCountry.default_display_name} ${availableCountry.country_code_alpha2}`,
      regionCode: availableCountry.flag_asset_key,
    }))

  return [
    {
      label: "Countries",
      items: countryOptions,
    },
  ]
}

function readDcxAppNormalizedSelectedIds(selectedIds: number[], maxCount: number): number[] {
  return Array.from(
    new Set(selectedIds.filter((selectedId) => Number.isInteger(selectedId) && selectedId > 0)),
  ).slice(0, maxCount)
}
