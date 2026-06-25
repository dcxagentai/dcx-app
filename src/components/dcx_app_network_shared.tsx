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
  const badges = [
    ...(props.languages ?? []).map((language) => ({
      key: `language:${language.id}`,
      label: `${language.language_name_native} (${language.language_code})`,
      regionCode: readDcxAppLanguageFlagRegionCode(language.language_code),
    })),
    ...(props.timezones ?? []).map((timezone) => ({
      key: `timezone:${timezone.id}`,
      label: timezone.display_label.replace(/^\(UTC[^)]*\)\s*/, ""),
      regionCode: timezone.flag_asset_key ?? timezone.country_code_alpha2 ?? undefined,
    })),
    ...(props.countries ?? []).map((country) => ({
      key: `country:${country.id}`,
      label: country.default_display_name,
      regionCode: country.flag_asset_key,
    })),
    ...(props.commodities ?? []).map((commodity) => ({
      key: `commodity:${commodity.material_key}`,
      label: commodity.display_label,
      regionCode: undefined,
    })),
  ].slice(0, maxItems)

  if (badges.length === 0) {
    return <p className="text-sm text-slate-500">No profile badges yet.</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <span
          key={badge.key}
          className="inline-flex max-w-full items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700"
        >
          {badge.regionCode ? (
            <DcxCountryFlagIcon regionCode={badge.regionCode} title={badge.label} fallbackLabel={badge.regionCode} className="h-3.5 w-5" />
          ) : null}
          <span className="truncate">{badge.label}</span>
        </span>
      ))}
    </div>
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
