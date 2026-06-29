/**
 * CONTEXT:
 * Small shared render helpers for the first DCX Network pages.
 * These keep profile badges and avatar rendering consistent across feed, profiles, and DMs.
 */

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { DcxCountryFlagIcon } from "./ui/dcx_country_flag_icon"
import type {
  DcxAppNetworkAuthor,
  DcxAppNetworkCommodityBadge,
  DcxAppNetworkCountryBadge,
  DcxAppNetworkLanguageBadge,
  DcxAppNetworkTimezoneBadge,
} from "../lib/dcx_app_network_api"
import { readDcxAppLanguageFlagRegionCode } from "../lib/dcx_app_language_flag_options"

export function DcxAppNetworkAvatar(props: {
  author: Pick<DcxAppNetworkAuthor, "public_identity_label" | "profile_image_url" | "public_handle">
  size?: "default" | "sm" | "lg"
}) {
  const fallbackText = readNetworkAvatarFallbackText(props.author.public_identity_label || props.author.public_handle)
  return (
    <Avatar size={props.size ?? "default"} className="bg-slate-100">
      {props.author.profile_image_url ? (
        <AvatarImage src={props.author.profile_image_url} alt={props.author.public_identity_label} />
      ) : null}
      <AvatarFallback>{fallbackText}</AvatarFallback>
    </Avatar>
  )
}

export function DcxAppNetworkProfileLink(props: {
  author: DcxAppNetworkAuthor
  className?: string
}) {
  const href = props.author.public_handle ? `/network/${props.author.public_handle}` : "#"
  return (
    <a href={href} className={props.className ?? "font-medium text-slate-950 hover:text-sky-700"}>
      {props.author.public_identity_label}
    </a>
  )
}

export function DcxAppNetworkBadgeList(props: {
  languages?: DcxAppNetworkLanguageBadge[]
  timezones?: DcxAppNetworkTimezoneBadge[]
  countries?: DcxAppNetworkCountryBadge[]
  commodities?: DcxAppNetworkCommodityBadge[]
  maxItems?: number
}) {
  const maxItems = props.maxItems ?? 40
  const countryBadges = (props.countries ?? []).map((country) => ({
    key: `country:${country.id}`,
    label: country.default_display_name,
    regionCode: country.flag_asset_key,
  }))
  const languageBadges = (props.languages ?? []).map((language) => ({
      key: `language:${language.id}`,
      label: `${language.language_name_native} (${language.language_code})`,
      regionCode: readDcxAppLanguageFlagRegionCode(language.language_code),
    }))
  const commodityBadges = (props.commodities ?? []).map((commodity) => ({
    key: `commodity:${commodity.material_key}`,
    label: commodity.display_label,
    regionCode: undefined,
  }))
  const timezoneBadges = (props.timezones ?? []).map((timezone) => ({
      key: `timezone:${timezone.id}`,
      label: timezone.display_label.replace(/^\(UTC[^)]*\)\s*/, ""),
      regionCode: timezone.flag_asset_key ?? timezone.country_code_alpha2 ?? undefined,
    }))
  const badgeGroups = [
    { key: "countries", label: "Countries", badges: countryBadges },
    { key: "languages", label: "Languages", badges: languageBadges },
    { key: "commodities", label: "Commodities", badges: commodityBadges },
    { key: "timezones", label: "Timezones", badges: timezoneBadges },
  ]
    .map((badgeGroup) => ({
      ...badgeGroup,
      badges: badgeGroup.badges.slice(0, Math.max(0, maxItems)),
    }))
    .filter((badgeGroup) => badgeGroup.badges.length > 0)

  if (badgeGroups.length === 0) {
    return <p className="text-sm text-slate-500">No profile badges yet.</p>
  }

  return (
    <div className="space-y-3">
      {badgeGroups.map((badgeGroup) => (
        <section key={badgeGroup.key} className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
            {badgeGroup.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {badgeGroup.badges.map((badge) => (
              <DcxAppNetworkProfileBadge key={badge.key} badge={badge} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function DcxAppNetworkProfileBadge(props: {
  badge: {
    key: string
    label: string
    regionCode?: string
  }
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">
      {props.badge.regionCode ? (
        <DcxCountryFlagIcon
          regionCode={props.badge.regionCode}
          title={props.badge.label}
          fallbackLabel={props.badge.regionCode}
          className="h-3.5 w-5"
        />
      ) : null}
      <span className="truncate">{props.badge.label}</span>
    </span>
  )
}

function readNetworkAvatarFallbackText(label: string): string {
  const words = label
    .replace(/^@/, "")
    .split(/\s|_/)
    .map((word) => word.trim())
    .filter(Boolean)
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase()
  }
  return (words[0]?.slice(0, 2) || "DC").toUpperCase()
}
