"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import VideocamRoundedIcon from "@mui/icons-material/VideocamRounded";
import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";
import { type ChatMessage } from "@/features/conversations/types";
import { StatusTick, renderWhatsAppText } from "./whatsappText";

export function DriverBubble({ message }: { message: ChatMessage }) {
  const isLocation = message.type === "LOCATION";
  const isVideo = message.type === "VIDEO";
  const image = message.attachments?.find(
    (attachment) => attachment.type === "IMAGE" && attachment.publicUrl,
  );
  const caption = message.text !== "[Image]" ? message.text : "";
  return (
    <div className="flex flex-col items-start">
      <div className="max-w-[90%] break-words rounded-xl rounded-tl-sm bg-slate-100 px-4 py-2.5 sm:max-w-[85%]">
        {image?.publicUrl ? (
          <>
            <a href={image.publicUrl} target="_blank" rel="noreferrer" className="block">
              <Box
                component="img"
                src={image.publicUrl}
                alt={image.filename ?? "Image sent by driver"}
                loading="lazy"
                sx={{
                  display: "block",
                  maxWidth: "100%",
                  maxHeight: 320,
                  borderRadius: 1.5,
                  objectFit: "contain",
                  bgcolor: "#f1f5f9",
                }}
              />
            </a>
            {caption && (
              <Typography variant="body2" sx={{ mt: 1, whiteSpace: "pre-wrap" }}>
                {caption}
              </Typography>
            )}
          </>
        ) : isLocation ? (
          <a
            href={`https://www.google.com/maps?q=${encodeURIComponent(message.text)}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 no-underline"
          >
            <LocationOnRoundedIcon sx={{ fontSize: 16, color: "#16a34a" }} />
            <Typography variant="body2" sx={{ fontWeight: 700, color: "#15803d" }}>
              {message.text}
            </Typography>
            <Typography variant="caption" sx={{ color: "#94a3b8" }}>
              open in maps
            </Typography>
          </a>
        ) : isVideo ? (
          <Chip
            size="small"
            icon={<VideocamRoundedIcon />}
            label="Video (unsupported)"
            sx={{ bgcolor: "#fee2e2", color: "#b91c1c", fontWeight: 700 }}
          />
        ) : (
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
            {message.text}
          </Typography>
        )}
        <Typography variant="caption" sx={{ display: "block", textAlign: "right", color: "#94a3b8", fontSize: 10.5 }}>
          {message.time}
        </Typography>
      </div>
      {message.interpretation && <AiCard message={message} />}
    </div>
  );
}

function AiCard({ message }: { message: ChatMessage }) {
  const ai = message.interpretation;
  if (!ai) return null;
  return (
    <details className="mt-1.5 w-full max-w-[90%] rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 sm:max-w-[85%]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <AutoAwesomeRoundedIcon sx={{ fontSize: 15, color: "#2563eb" }} />
          <Typography variant="caption" sx={{ fontWeight: 600, color: "#1d4ed8", fontSize: 11 }}>
            AI interpretation
          </Typography>
        </div>
        <Typography variant="caption" sx={{ color: "#64748b", fontSize: 11 }}>
          {Math.round(ai.confidence * 100)}% · {message.time}
        </Typography>
      </summary>
      <div className="flex items-center justify-between border-b border-blue-100/70 py-1.5">
        <Typography variant="caption" sx={{ color: "#64748b" }}>
          Intent
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 800, fontFamily: "var(--font-geist-mono)", letterSpacing: "0.04em" }}>
          {ai.intent}
        </Typography>
      </div>
      {ai.fields.map((field) => (
        <div key={field.label} className="flex items-center justify-between border-b border-blue-100/70 py-1.5 last:border-b-0">
          <Typography variant="caption" sx={{ color: "#64748b" }}>
            {field.label}
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {field.value}
          </Typography>
        </div>
      ))}
    </details>
  );
}

export function ManagerBubble({ message }: { message: ChatMessage }) {
  const failed = message.deliveryStatus === "FAILED";
  return (
    <div className="flex flex-col items-end">
      <div className="max-w-[90%] rounded-xl rounded-br-sm bg-[#1e3a8a] px-4 py-2.5 text-white sm:max-w-[85%]">
        <Typography variant="caption" sx={{ color: "#dbeafe", fontWeight: 600, fontSize: 10, }}>
          Manager
        </Typography>
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", overflowWrap: "break-word" }}>
          {renderWhatsAppText(message.text)}
        </Typography>
        <div className="flex items-center justify-end gap-1">
          {failed && (
            <Typography variant="caption" sx={{ color: "#dc2626", fontSize: 10.5, fontWeight: 700 }}>
              Failed to send
            </Typography>
          )}
          <Typography variant="caption" sx={{ color: "#dbeafe", fontSize: 10.5 }}>
            {message.time}
          </Typography>
          <StatusTick status={message.deliveryStatus} />
        </div>
      </div>
    </div>
  );
}

export function BotBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="flex flex-col items-end">
      <div className="max-w-[90%] rounded-xl rounded-br-sm bg-teal-50 px-4 py-2.5 sm:max-w-[85%]">
        <div className="flex items-start gap-2">
          <Typography variant="body2" sx={{ color: "#334155", whiteSpace: "pre-wrap", overflowWrap: "break-word", lineHeight: 1.55 }}>
            {renderWhatsAppText(message.text)}
          </Typography>
        </div>
        <Typography
          variant="caption"
          sx={{ display: "block", mt: 0.5, textAlign: "right", color: "#64748b", fontSize: 10, letterSpacing: "0.08em", fontWeight: 600 }}
        >
          <span className="inline-flex items-center gap-1">
            <SmartToyRoundedIcon sx={{ fontSize: 13 }} />
            BOT CONFIRMATION · {message.time}
          </span>
        </Typography>
      </div>
    </div>
  );
}

/** A message in the thread: the driver's, a manager's, or the bot's. */
export function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.kind === "DRIVER") return <DriverBubble message={message} />;
  if (message.kind === "MANAGER") return <ManagerBubble message={message} />;
  return <BotBubble message={message} />;
}
