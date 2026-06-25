/**
 * CONTEXT:
 * Authenticated DCX app Send page.
 * It exists so trader-authored app messages have a focused compose surface while the Messages
 * page stays dedicated to browsing, searching, and filtering inbound history.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  FileAudioIcon,
  FileIcon,
  FileImageIcon,
  FileTextIcon,
  Loader2Icon,
  PaperclipIcon,
  SendHorizontalIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import { createDcxAppAuthenticatedUserContactMessage } from "../lib/create_dcx_app_authenticated_user_contact_message"
import { retryDcxAppAuthenticatedUserMessageAnalysis } from "../lib/retry_dcx_app_authenticated_user_message_analysis"
import type { DcxAppAuthenticatedUserMessageDetail } from "../lib/read_dcx_app_authenticated_user_message_detail"
import { readDcxAppAuthenticatedUserAccountSummary } from "../lib/read_dcx_app_authenticated_user_account_summary"
import { DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS } from "./dcx_app_user_account_shared"

type Props = {
  apiBaseUrl: string
}

type DcxAppSendStage =
  | "idle"
  | "preparing"
  | "uploading"
  | "processing"
  | "prohibited"
  | "analysis_failed"
  | "success"
  | "error"

type DcxSendProgressStepStatus = "pending" | "current" | "complete" | "failed"

type DcxSendProgressStep = {
  key: string
  indexLabel: string
  title: string
  body: string
  status: DcxSendProgressStepStatus
}

type DcxSendOutcomeLink = {
  key: string
  label: string
  path: string
  detail: string
}

export function DcxAppSendMessagePage(props: Props) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [messageText, setMessageText] = useState("")
  const [messageFiles, setMessageFiles] = useState<File[]>([])
  const [fileInputResetKey, setFileInputResetKey] = useState(0)
  const [sendStage, setSendStage] = useState<DcxAppSendStage>("idle")
  const [lastCreatedMessageDetail, setLastCreatedMessageDetail] = useState<DcxAppAuthenticatedUserMessageDetail | null>(null)

  const messageFilePreviews = useMemo(
    () =>
      messageFiles.map((messageFile, fileIndex) => ({
        key: `${messageFile.name}-${messageFile.size}-${fileIndex}`,
        file: messageFile,
        previewUrl: messageFile.type.startsWith("image/") || messageFile.type.startsWith("audio/")
          ? URL.createObjectURL(messageFile)
          : null,
      })),
    [messageFiles],
  )

  useEffect(() => {
    return () => {
      messageFilePreviews.forEach((messageFilePreview) => {
        if (messageFilePreview.previewUrl) {
          URL.revokeObjectURL(messageFilePreview.previewUrl)
        }
      })
    }
  }, [messageFilePreviews])

  const accountSummaryQuery = useQuery({
    queryKey: ["dcx_app_authenticated_user_account_summary"],
    queryFn: async () =>
      readDcxAppAuthenticatedUserAccountSummary({
        apiBaseUrl: props.apiBaseUrl,
      }),
  })

  const retryMessageAnalysisMutation = useMutation({
    mutationFn: async (messageId: number) =>
      retryDcxAppAuthenticatedUserMessageAnalysis({
        apiBaseUrl: props.apiBaseUrl,
        messageId,
      }),
    onSuccess: async (payload) => {
      setLastCreatedMessageDetail(payload.data)
      setSendStage(readDcxSendStageFromCreatedMessageDetail(payload.data))
      await queryClient.invalidateQueries({
        queryKey: ["dcx_app_authenticated_user_messages_inbox"],
      })
    },
    onError: async () => {
      setSendStage("analysis_failed")
    },
  })

  const createMessageMutation = useMutation({
    mutationFn: async (nextMessage: { messageText: string; messageFiles: File[] }) =>
      createDcxAppAuthenticatedUserContactMessage({
        apiBaseUrl: props.apiBaseUrl,
        messageText: nextMessage.messageText,
        messageFiles: nextMessage.messageFiles,
      }),
    onMutate: async () => {
      retryMessageAnalysisMutation.reset()
      setLastCreatedMessageDetail(null)
      setSendStage("preparing")
    },
    onSuccess: async (payload) => {
      setLastCreatedMessageDetail(payload.data)
      setMessageText("")
      setMessageFiles([])
      setFileInputResetKey((currentValue) => currentValue + 1)
      setSendStage(readDcxSendStageFromCreatedMessageDetail(payload.data))
      await queryClient.invalidateQueries({
        queryKey: ["dcx_app_authenticated_user_messages_inbox"],
      })
    },
    onError: async () => {
      setSendStage("error")
    },
  })

  const ux = accountSummaryQuery.data?.data.ux_strings ?? DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS
  const canSendMessage = messageText.trim().length > 0 || messageFiles.length > 0
  const isSendingMessage = createMessageMutation.isPending
  const isRetryingAnalysis = retryMessageAnalysisMutation.isPending
  const hasFailedAnalysis = sendStage === "analysis_failed" && lastCreatedMessageDetail !== null
  const hasProhibitedContent = sendStage === "prohibited" && lastCreatedMessageDetail !== null
  const sendCommentary = readDcxSendCommentary(sendStage, messageFilePreviews.length, ux)
  const sendProgressSteps = useMemo(
    () =>
      readDcxSendProgressSteps({
        sendStage,
        fileCount: messageFilePreviews.length,
        uxStrings: ux,
        isRetryingAnalysis,
        createdMessageDetail: lastCreatedMessageDetail,
      }),
    [isRetryingAnalysis, lastCreatedMessageDetail, messageFilePreviews.length, sendStage, ux],
  )
  const sendOutcomeLinks = useMemo(
    () => readDcxSendOutcomeLinks(lastCreatedMessageDetail, ux),
    [lastCreatedMessageDetail, ux],
  )
  const analysisModelNote = lastCreatedMessageDetail?.analysis_model_name
    ? `${ux.messages_detail_analysis_model_label ?? "Analysis model"}: ${lastCreatedMessageDetail.analysis_model_name}`
    : null
  const isFormLocked = isSendingMessage

  useEffect(() => {
    if (!isSendingMessage) {
      return
    }
    setSendStage("preparing")
    const hasFiles = messageFiles.length > 0
    const uploadTimer = hasFiles
      ? window.setTimeout(() => setSendStage("uploading"), 450)
      : null
    const processingTimer = window.setTimeout(
      () => setSendStage("processing"),
      hasFiles ? 1800 : 900,
    )
    return () => {
      if (uploadTimer !== null) {
        window.clearTimeout(uploadTimer)
      }
      window.clearTimeout(processingTimer)
    }
  }, [isSendingMessage, messageFiles.length])

  useEffect(() => {
    if (sendStage !== "error") {
      return
    }
    const resetTimer = window.setTimeout(() => {
      setSendStage("idle")
      setLastCreatedMessageDetail(null)
      createMessageMutation.reset()
      retryMessageAnalysisMutation.reset()
    }, 6000)
    return () => window.clearTimeout(resetTimer)
  }, [createMessageMutation, retryMessageAnalysisMutation, sendStage])

  return (
    <section className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 text-slate-950">
      <section className="border border-black/6 bg-white p-5 shadow-[0_18px_55px_-48px_rgba(15,23,42,0.45)]">
        <div className="max-w-5xl">
          <Label htmlFor="dcx-app-message-compose-input" className="text-xs font-semibold uppercase text-slate-500">
            {ux.messages_compose_label}
          </Label>
          <Textarea
            id="dcx-app-message-compose-input"
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
            placeholder={ux.messages_compose_placeholder}
            disabled={isFormLocked}
            className="mt-2 min-h-44 w-full resize-y bg-white text-sm leading-7"
          />
        </div>

        <div className="mt-4 max-w-5xl">
          <Input
            key={fileInputResetKey}
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/jfif,audio/mpeg,audio/ogg,audio/wav,audio/mp4,.pdf,.docx,.pptx"
            className="sr-only"
            disabled={isFormLocked}
            onChange={(event) => setMessageFiles(Array.from(event.target.files ?? []))}
          />
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-fit justify-start"
                disabled={isFormLocked}
                onClick={() => fileInputRef.current?.click()}
              >
                <PaperclipIcon />
                {ux.messages_compose_files_label}
              </Button>
              <p className="text-sm leading-6 text-slate-500">{ux.messages_compose_help}</p>
            </div>
            <Button
              type="button"
              disabled={!canSendMessage || isSendingMessage}
              onClick={() => createMessageMutation.mutate({ messageText, messageFiles })}
            >
              {isSendingMessage ? <Loader2Icon className="animate-spin" /> : <SendHorizontalIcon />}
              {isSendingMessage
                ? ux.messages_compose_submit_pending
                : ux.messages_compose_submit_idle}
            </Button>
          </div>
        </div>

        {messageFilePreviews.length > 0 ? (
          <div className="mt-5 max-w-5xl space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {ux.messages_compose_files_selected}
              </p>
              <p className="text-xs text-slate-500">
                {messageFilePreviews.length} {messageFilePreviews.length === 1
                  ? (ux.messages_compose_files_count_singular ?? "file")
                  : (ux.messages_compose_files_count_plural ?? "files")}
              </p>
            </div>
            <div className="space-y-3">
              {messageFilePreviews.map((messageFilePreview, fileIndex) => (
                <DcxSendSelectedAttachmentCard
                  key={messageFilePreview.key}
                  file={messageFilePreview.file}
                  previewUrl={messageFilePreview.previewUrl}
                  locked={isFormLocked}
                  sendingStage={sendStage}
                  uxStrings={ux}
                  onRemove={() => {
                    setMessageFiles((currentFiles) => currentFiles.filter((_, currentIndex) => currentIndex !== fileIndex))
                    setFileInputResetKey((currentValue) => currentValue + 1)
                  }}
                />
              ))}
            </div>
          </div>
        ) : null}

        <DcxSendProgressPanel
          commentary={sendCommentary}
          steps={sendProgressSteps}
          isVisible={
            isSendingMessage ||
            createMessageMutation.isSuccess ||
            createMessageMutation.isError ||
            hasProhibitedContent ||
            hasFailedAnalysis ||
            retryMessageAnalysisMutation.isPending ||
            retryMessageAnalysisMutation.isSuccess ||
            retryMessageAnalysisMutation.isError
          }
          isSuccess={sendStage === "success"}
          isError={createMessageMutation.isError}
          isProhibited={hasProhibitedContent}
          isAnalysisFailed={hasFailedAnalysis}
          isRetryingAnalysis={isRetryingAnalysis}
          retryLabel={ux.messages_detail_retry_analysis_button ?? "Retry analysis"}
          retryPendingLabel={ux.messages_detail_retry_analysis_pending ?? "Retrying..."}
          outcomeLinks={sendOutcomeLinks}
          onRetryAnalysis={hasFailedAnalysis && lastCreatedMessageDetail
            ? () => retryMessageAnalysisMutation.mutate(lastCreatedMessageDetail.message_id)
            : null}
          modelNote={analysisModelNote}
          errorText={
            createMessageMutation.isError
              ? ((createMessageMutation.error as Error & { suggested_action?: string }).message)
              : retryMessageAnalysisMutation.isError
                ? ((retryMessageAnalysisMutation.error as Error & { suggested_action?: string }).message)
                : null
          }
        />

        {createMessageMutation.isError || retryMessageAnalysisMutation.isError ? (
          <p className="mt-3 text-sm text-red-600">
            {(
              createMessageMutation.isError
                ? (createMessageMutation.error as Error & { suggested_action?: string }).suggested_action
                : (retryMessageAnalysisMutation.error as Error & { suggested_action?: string }).suggested_action
            ) ??
              (ux.messages_compose_error_retry_suggested_action ?? "Retry after confirming the connection and selected files.")}
          </p>
        ) : null}
      </section>
    </section>
  )
}

function DcxSendProgressPanel(props: {
  commentary: { title: string; body: string }
  steps: DcxSendProgressStep[]
  isVisible: boolean
  isSuccess: boolean
  isError: boolean
  isProhibited: boolean
  isAnalysisFailed: boolean
  isRetryingAnalysis: boolean
  retryLabel: string
  retryPendingLabel: string
  outcomeLinks: DcxSendOutcomeLink[]
  onRetryAnalysis: (() => void) | null
  modelNote: string | null
  errorText: string | null
}) {
  if (!props.isVisible) {
    return null
  }

  return (
    <div
      className={cn(
        "mt-5 max-w-5xl rounded-lg border px-4 py-3",
        props.isError
          ? "border-red-200 bg-red-50/70"
          : props.isProhibited
            ? "border-red-200 bg-red-50/70"
          : props.isAnalysisFailed
            ? "border-amber-300 bg-amber-50/80"
          : props.isSuccess
            ? "border-emerald-200 bg-emerald-50/70"
            : "border-slate-200 bg-slate-50/80",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="pt-0.5">
          {props.isSuccess ? (
            <CheckCircle2Icon className="size-5 text-emerald-600" />
          ) : props.isError ? (
            <XIcon className="size-5 text-red-600" />
          ) : props.isProhibited ? (
            <AlertTriangleIcon className="size-5 text-red-600" />
          ) : props.isAnalysisFailed ? (
            <AlertTriangleIcon className="size-5 text-amber-600" />
          ) : (
            <Loader2Icon className="size-5 animate-spin text-slate-500" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-950">{props.commentary.title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {props.errorText ?? props.commentary.body}
          </p>
          {props.steps.length > 0 ? (
            <ol className="mt-4 space-y-3">
              {props.steps.map((step) => (
                <li key={step.key} className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full border px-1.5 text-[11px] font-semibold",
                      step.status === "complete"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : step.status === "current"
                          ? "border-sky-200 bg-sky-50 text-sky-700"
                          : step.status === "failed"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-slate-200 bg-white text-slate-500",
                    )}
                  >
                    {step.indexLabel}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      {step.status === "complete" ? (
                        <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                      ) : step.status === "current" ? (
                        <Loader2Icon className="mt-0.5 size-4 shrink-0 animate-spin text-sky-600" />
                      ) : step.status === "failed" ? (
                        <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-600" />
                      ) : (
                        <div className="mt-[5px] h-2 w-2 shrink-0 rounded-full bg-slate-300" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">{step.title}</p>
                        <p className="mt-0.5 text-xs leading-5 text-slate-500">{step.body}</p>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : null}
          {props.modelNote ? (
            <p className="mt-2 text-xs text-slate-500">{props.modelNote}</p>
          ) : null}
          {props.outcomeLinks.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {props.outcomeLinks.map((outcomeLink) => (
                <Button
                  key={outcomeLink.key}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="bg-white"
                  title={outcomeLink.detail}
                  onClick={() => navigateToDcxAppPath(outcomeLink.path)}
                >
                  {outcomeLink.label}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
        {props.isAnalysisFailed && props.onRetryAnalysis ? (
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            disabled={props.isRetryingAnalysis}
            onClick={props.onRetryAnalysis}
          >
            {props.isRetryingAnalysis ? <Loader2Icon className="animate-spin" /> : null}
            {props.isRetryingAnalysis ? props.retryPendingLabel : props.retryLabel}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function DcxSendSelectedAttachmentCard(props: {
  file: File
  previewUrl: string | null
  locked: boolean
  sendingStage: DcxAppSendStage
  uxStrings: Record<string, string>
  onRemove: () => void
}) {
  const isImage = props.file.type.startsWith("image/")
  const isAudio = props.file.type.startsWith("audio/")
  const cardStatus = readDcxSendAttachmentStatusLabel(props.sendingStage, props.uxStrings)

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50/70">
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-500">
              {readDcxFileKindIcon(props.file.type)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-950">{props.file.name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="uppercase tracking-[0.12em] text-slate-600">
                  {readDcxSendFormatLabel(props.file.type, props.uxStrings)}
                </span>
                <span>{formatDcxFileSizeLabel(props.file.size)}</span>
                <span>{cardStatus}</span>
              </div>
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          disabled={props.locked}
          aria-label={`Remove ${props.file.name}`}
          onClick={props.onRemove}
        >
          <XIcon className="size-4" />
        </Button>
      </div>

      {isImage && props.previewUrl ? (
        <div className="border-t border-slate-200 bg-white px-4 py-4">
          <img
            src={props.previewUrl}
            alt={props.file.name}
            className="max-h-64 w-auto rounded-md border border-slate-200 object-contain"
          />
        </div>
      ) : null}

      {isAudio && props.previewUrl ? (
        <div className="border-t border-slate-200 bg-white px-4 py-4">
          <audio controls className="w-full">
            <source src={props.previewUrl} type={props.file.type} />
          </audio>
        </div>
      ) : null}
    </div>
  )
}

function readDcxSendCommentary(
  sendStage: DcxAppSendStage,
  fileCount: number,
  uxStrings: Record<string, string>,
): { title: string; body: string } {
  if (sendStage === "preparing") {
    return {
      title: uxStrings.messages_compose_progress_preparing_title ?? "Preparing message...",
      body: fileCount > 0
        ? (uxStrings.messages_compose_progress_preparing_body_with_files ?? `We are packaging your note and ${fileCount} selected ${fileCount === 1 ? "file" : "files"} for secure upload.`)
        : (uxStrings.messages_compose_progress_preparing_body_no_files ?? "We are preparing your message for delivery."),
    }
  }
  if (sendStage === "uploading") {
    return {
      title: uxStrings.messages_compose_progress_uploading_title ?? "Uploading files...",
      body: fileCount > 0
        ? (uxStrings.messages_compose_progress_uploading_body_with_files ?? `Your selected ${fileCount === 1 ? "file is" : "files are"} being uploaded. Larger media can take a little longer.`)
        : (uxStrings.messages_compose_progress_uploading_body_no_files ?? "Your message is on its way."),
    }
  }
  if (sendStage === "processing") {
    return {
      title: uxStrings.messages_compose_progress_processing_title ?? "Processing message...",
      body: uxStrings.messages_compose_progress_processing_body ?? "DCX is storing the message and preparing the first analysis pass.",
    }
  }
  if (sendStage === "success") {
    return {
      title: uxStrings.messages_compose_progress_success_title ?? "Message sent.",
      body: uxStrings.messages_compose_progress_success_body ?? "Your message is now in the inbox and ready for review in Messages.",
    }
  }
  if (sendStage === "prohibited") {
    return {
      title: uxStrings.messages_compose_progress_prohibited_title ?? "Prohibited content",
      body: uxStrings.messages_compose_progress_prohibited_body ?? "This message was received but blocked by content policy.",
    }
  }
  if (sendStage === "analysis_failed") {
    return {
      title: uxStrings.messages_detail_analysis_failed_title ?? "LLM call failed.",
      body: uxStrings.messages_detail_analysis_failed_body ?? "The message was received, but the AI analysis step did not complete. Please retry.",
    }
  }
  if (sendStage === "error") {
    return {
      title: uxStrings.messages_compose_progress_error_title ?? "We could not send that message.",
      body: uxStrings.messages_compose_progress_error_body ?? "Please review the details below and retry when you are ready.",
    }
  }
  return {
    title: "",
    body: "",
  }
}

function readDcxSendProgressSteps(props: {
  sendStage: DcxAppSendStage
  fileCount: number
  uxStrings: Record<string, string>
  isRetryingAnalysis: boolean
  createdMessageDetail: DcxAppAuthenticatedUserMessageDetail | null
}): DcxSendProgressStep[] {
  const hasFiles = props.fileCount > 0
  const stepDefinitions = hasFiles
    ? [
        {
          key: "prepare",
          title: props.uxStrings.messages_compose_progress_preparing_title ?? "Preparing message...",
          body:
            props.uxStrings.messages_compose_progress_preparing_body_with_files ??
            "We are packaging your note and selected files for secure upload.",
        },
        {
          key: "upload",
          title: props.uxStrings.messages_compose_progress_uploading_title ?? "Uploading files...",
          body:
            props.uxStrings.messages_compose_progress_uploading_body_with_files ??
            "Your selected files are being uploaded. Larger media can take a little longer.",
        },
        {
          key: "process",
          title: props.uxStrings.messages_compose_progress_processing_title ?? "Processing message...",
          body:
            props.uxStrings.messages_compose_progress_processing_body ??
            "DCX is storing the message and preparing the first analysis pass.",
        },
        {
          key: "route",
          title: props.uxStrings.messages_compose_progress_routing_title ?? "Routing workflow...",
          body:
            props.uxStrings.messages_compose_progress_routing_body ??
            "DCX is deciding whether this is a trade, market topic, other message, or prohibited content.",
        },
        {
          key: "final",
          title: props.uxStrings.messages_compose_progress_success_title ?? "Message sent.",
          body:
            props.uxStrings.messages_compose_progress_success_body ??
            "Your message is now in the inbox and ready for review in Messages.",
        },
      ]
    : [
        {
          key: "prepare",
          title: props.uxStrings.messages_compose_progress_preparing_title ?? "Preparing message...",
          body:
            props.uxStrings.messages_compose_progress_preparing_body_no_files ??
            "We are preparing your message for delivery.",
        },
        {
          key: "process",
          title: props.uxStrings.messages_compose_progress_processing_title ?? "Processing message...",
          body:
            props.uxStrings.messages_compose_progress_processing_body ??
            "DCX is storing the message and preparing the first analysis pass.",
        },
        {
          key: "route",
          title: props.uxStrings.messages_compose_progress_routing_title ?? "Routing workflow...",
          body:
            props.uxStrings.messages_compose_progress_routing_body ??
            "DCX is deciding whether this is a trade, market topic, other message, or prohibited content.",
        },
        {
          key: "final",
          title: props.uxStrings.messages_compose_progress_success_title ?? "Message sent.",
          body:
            props.uxStrings.messages_compose_progress_success_body ??
            "Your message is now in the inbox and ready for review in Messages.",
        },
      ]

  const activeStepKey = readDcxSendActiveProgressStepKey(props.sendStage, hasFiles)
  const failureStepKey =
    props.sendStage === "analysis_failed" && !props.isRetryingAnalysis
      ? "process"
      : props.sendStage === "error"
        ? activeStepKey
        : null

  return stepDefinitions.map((stepDefinition, stepIndex) => {
    const stepPosition = stepDefinitions.findIndex((currentStep) => currentStep.key === stepDefinition.key)
    const activeStepPosition = stepDefinitions.findIndex((currentStep) => currentStep.key === activeStepKey)
    const isFailedStep = failureStepKey === stepDefinition.key
    const isCurrentStep =
      !isFailedStep &&
      (props.isRetryingAnalysis
        ? stepDefinition.key === "process"
        : stepDefinition.key === activeStepKey) &&
      props.sendStage !== "success" &&
      props.sendStage !== "prohibited"
    const isCompleteStep =
      props.sendStage === "success" || props.sendStage === "prohibited"
        ? stepDefinition.key !== "final"
          ? true
          : true
        : !isFailedStep && activeStepPosition > stepPosition

    return {
      key: stepDefinition.key,
      indexLabel: `${stepIndex + 1}/${stepDefinitions.length}`,
      title: readDcxSendProgressStepTitle(stepDefinition.key, props.sendStage, props.uxStrings, props.isRetryingAnalysis),
      body: readDcxSendProgressStepBody(
        stepDefinition.key,
        stepDefinition.body,
        props.sendStage,
        props.uxStrings,
        hasFiles,
        props.createdMessageDetail,
      ),
      status: isFailedStep ? "failed" : isCurrentStep ? "current" : isCompleteStep ? "complete" : "pending",
    }
  })
}

function readDcxSendActiveProgressStepKey(sendStage: DcxAppSendStage, hasFiles: boolean): string {
  if (sendStage === "preparing") {
    return "prepare"
  }
  if (sendStage === "uploading" && hasFiles) {
    return "upload"
  }
  if (sendStage === "processing" || sendStage === "analysis_failed" || sendStage === "error") {
    return "process"
  }
  return "final"
}

function readDcxSendProgressStepTitle(
  stepKey: string,
  sendStage: DcxAppSendStage,
  uxStrings: Record<string, string>,
  isRetryingAnalysis: boolean,
): string {
  if (stepKey === "final") {
    if (sendStage === "prohibited") {
      return uxStrings.messages_compose_progress_message_blocked_title ?? "Message blocked"
    }
    if (sendStage === "analysis_failed") {
      return isRetryingAnalysis
        ? (uxStrings.messages_detail_retry_analysis_pending ?? "Retrying...")
        : (uxStrings.messages_detail_analysis_failed_title ?? "LLM call failed.")
    }
    if (sendStage === "error") {
      return uxStrings.messages_compose_progress_error_title ?? "We could not send that message."
    }
  }

  if (stepKey === "route") {
    if (sendStage === "prohibited") {
      return uxStrings.messages_compose_progress_prohibited_title ?? "Prohibited content"
    }
    return uxStrings.messages_compose_progress_routed_title ?? "Workflow routed."
  }

  if (stepKey === "process" && isRetryingAnalysis) {
    return uxStrings.messages_detail_retry_analysis_pending ?? "Retrying..."
  }

  if (stepKey === "prepare") {
    return uxStrings.messages_compose_progress_preparing_title ?? "Preparing message..."
  }
  if (stepKey === "upload") {
    return uxStrings.messages_compose_progress_uploading_title ?? "Uploading files..."
  }
  if (stepKey === "process") {
    return uxStrings.messages_compose_progress_processing_title ?? "Processing message..."
  }
  return uxStrings.messages_compose_progress_success_title ?? "Message sent."
}

function readDcxSendProgressStepBody(
  stepKey: string,
  defaultBody: string,
  sendStage: DcxAppSendStage,
  uxStrings: Record<string, string>,
  hasFiles: boolean,
  createdMessageDetail: DcxAppAuthenticatedUserMessageDetail | null,
): string {
  if (stepKey === "route" && (sendStage === "success" || sendStage === "prohibited")) {
    return readDcxSendWorkflowOutcomeSummary(createdMessageDetail, uxStrings)
  }

  if (stepKey === "final") {
    if (sendStage === "prohibited") {
      return uxStrings.messages_compose_progress_prohibited_body ?? "This message was received but blocked by content policy."
    }
    if (sendStage === "analysis_failed") {
      return uxStrings.messages_detail_analysis_failed_body ?? "The message was received, but the AI analysis step did not complete. Please retry."
    }
    if (sendStage === "error") {
      return uxStrings.messages_compose_progress_error_body ?? "Please review the details below and retry when you are ready."
    }
    if (sendStage === "success") {
      return readDcxSendFinalOutcomeSummary(createdMessageDetail, uxStrings)
    }
  }

  if (stepKey === "upload" && !hasFiles) {
    return uxStrings.messages_compose_progress_uploading_body_no_files ?? "Your message is on its way."
  }

  return defaultBody
}

function readDcxSendWorkflowOutcomeSummary(
  messageDetail: DcxAppAuthenticatedUserMessageDetail | null,
  uxStrings: Record<string, string>,
): string {
  if (!messageDetail) {
    return uxStrings.messages_compose_progress_routing_complete_body ?? "Workflow routing is complete."
  }

  if (readDcxMessageHasProhibitedContent(messageDetail.analysis_metadata_json)) {
    return uxStrings.messages_compose_progress_prohibited_body ?? "This message was received but blocked by content policy."
  }

  const tradeCount = messageDetail.linked_trades.length
  const topicCount = messageDetail.linked_market_topics.length
  const hasOther = messageDetail.contains_other_items
  const outcomeParts = []

  if (tradeCount > 0) {
    outcomeParts.push(
      `${tradeCount} ${
        tradeCount === 1
          ? (uxStrings.messages_compose_progress_trade_candidate_singular ?? "trade candidate")
          : (uxStrings.messages_compose_progress_trade_candidate_plural ?? "trade candidates")
      }`,
    )
  }
  if (topicCount > 0) {
    outcomeParts.push(
      `${topicCount} ${
        topicCount === 1
          ? (uxStrings.messages_compose_progress_market_topic_singular ?? "market topic")
          : (uxStrings.messages_compose_progress_market_topic_plural ?? "market topics")
      }`,
    )
  }
  if (hasOther && tradeCount === 0 && topicCount === 0) {
    outcomeParts.push(uxStrings.messages_compose_progress_other_label ?? "Other")
  }

  if (outcomeParts.length === 0) {
    return uxStrings.messages_compose_progress_stored_for_review_body ?? "Stored in Messages for review."
  }

  return `${uxStrings.messages_compose_progress_routed_as_prefix ?? "Routed as"} ${outcomeParts.join(" and ")}.`
}

function readDcxSendFinalOutcomeSummary(
  messageDetail: DcxAppAuthenticatedUserMessageDetail | null,
  uxStrings: Record<string, string> = DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS,
): string {
  if (!messageDetail) {
    return uxStrings.messages_compose_progress_open_message_default_body ?? "Open the message from Messages when you are ready."
  }

  const linkedOutputCount = messageDetail.linked_trades.length + messageDetail.linked_market_topics.length
  if (linkedOutputCount > 0) {
    return uxStrings.messages_compose_progress_open_outputs_body ?? "Open the message or jump straight to the created trade/topic output."
  }
  if (messageDetail.contains_other_items) {
    return uxStrings.messages_compose_progress_open_other_body ?? "Open the message to review the stored Other item."
  }
  return uxStrings.messages_compose_progress_open_message_default_body ?? "Open the message from Messages when you are ready."
}

function readDcxSendOutcomeLinks(
  messageDetail: DcxAppAuthenticatedUserMessageDetail | null,
  uxStrings: Record<string, string> = DCX_APP_ACCOUNT_PAGE_DEFAULT_UX_STRINGS,
): DcxSendOutcomeLink[] {
  if (!messageDetail) {
    return []
  }

  return [
    {
      key: `message-${messageDetail.message_id}`,
      label: uxStrings.messages_compose_outcome_open_message ?? "Open message",
      path: `/me/messages/${messageDetail.message_id}`,
      detail: `Open message #${messageDetail.message_id}`,
    },
    ...messageDetail.linked_trades.map((linkedTrade, tradeIndex) => ({
      key: `trade-${linkedTrade.trade_id}`,
      label: messageDetail.linked_trades.length === 1
        ? (uxStrings.messages_compose_outcome_open_trade ?? "Open trade")
        : `${uxStrings.messages_compose_outcome_open_trade ?? "Open trade"} ${tradeIndex + 1}`,
      path: `/trades/objects/${linkedTrade.trade_id}`,
      detail: linkedTrade.trade_summary_text || `Open trade #${linkedTrade.trade_id}`,
    })),
    ...messageDetail.linked_market_topics.map((linkedMarketTopic, topicIndex) => ({
      key: `topic-${linkedMarketTopic.market_topic_id}`,
      label: messageDetail.linked_market_topics.length === 1
        ? (uxStrings.messages_compose_outcome_open_topic ?? "Open topic")
        : `${uxStrings.messages_compose_outcome_open_topic ?? "Open topic"} ${topicIndex + 1}`,
      path: `/me/topics/${linkedMarketTopic.market_topic_id}`,
      detail: linkedMarketTopic.topic_title || `Open topic #${linkedMarketTopic.market_topic_id}`,
    })),
  ]
}

function navigateToDcxAppPath(pathnameWithSearch: string): void {
  if (typeof window === "undefined") {
    return
  }
  window.history.pushState({}, "", pathnameWithSearch)
  window.dispatchEvent(new PopStateEvent("popstate"))
}

function readDcxSendAttachmentStatusLabel(
  sendStage: DcxAppSendStage,
  uxStrings: Record<string, string>,
): string {
  if (sendStage === "preparing") {
    return uxStrings.messages_compose_attachment_status_queued ?? "Queued"
  }
  if (sendStage === "uploading") {
    return uxStrings.messages_compose_attachment_status_uploading ?? "Uploading"
  }
  if (sendStage === "processing") {
    return uxStrings.messages_compose_attachment_status_attached ?? "Attached"
  }
  if (sendStage === "success") {
    return uxStrings.messages_compose_attachment_status_sent ?? "Sent"
  }
  if (sendStage === "error") {
    return uxStrings.messages_compose_attachment_status_retry_needed ?? "Retry needed"
  }
  return uxStrings.messages_compose_attachment_status_ready ?? "Ready to send"
}

function readDcxSendFormatLabel(contentType: string, uxStrings: Record<string, string>): string {
  if (contentType.startsWith("image/")) {
    return uxStrings.messages_format_label_image ?? "image"
  }
  if (contentType.startsWith("audio/")) {
    return uxStrings.messages_format_label_audio ?? "audio"
  }
  if (contentType.includes("pdf") || contentType.includes("document") || contentType.includes("presentation")) {
    return uxStrings.messages_format_label_document ?? "doc"
  }
  return uxStrings.messages_format_label_text ?? "text"
}

function readDcxFileKindIcon(contentType: string) {
  if (contentType.startsWith("image/")) {
    return <FileImageIcon className="size-3.5" />
  }
  if (contentType.startsWith("audio/")) {
    return <FileAudioIcon className="size-3.5" />
  }
  if (contentType.includes("pdf") || contentType.includes("document") || contentType.includes("presentation")) {
    return <FileIcon className="size-3.5" />
  }
  return <FileTextIcon className="size-3.5" />
}

function formatDcxFileSizeLabel(fileSizeBytes: number): string {
  if (fileSizeBytes < 1024) {
    return `${fileSizeBytes} B`
  }
  if (fileSizeBytes < 1024 * 1024) {
    return `${(fileSizeBytes / 1024).toFixed(1)} KB`
  }
  return `${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`
}

function readDcxSendStageFromCreatedMessageDetail(
  messageDetail: DcxAppAuthenticatedUserMessageDetail,
): DcxAppSendStage {
  if (readDcxMessageHasProhibitedContent(messageDetail.analysis_metadata_json)) {
    return "prohibited"
  }

  if (messageDetail.analysis_status === "failed") {
    return "analysis_failed"
  }

  return "success"
}

function readDcxMessageHasProhibitedContent(analysisMetadataJson: Record<string, unknown> | null | undefined): boolean {
  if (!analysisMetadataJson || typeof analysisMetadataJson !== "object") {
    return false
  }
  return String(analysisMetadataJson["moderation_status"] ?? "").trim().toLowerCase() === "prohibited"
}
