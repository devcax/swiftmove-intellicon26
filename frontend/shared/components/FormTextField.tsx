"use client";

import TextField, { type TextFieldProps } from "@mui/material/TextField";
import { styled } from "@mui/material/styles";

const StyledTextField = styled(TextField)({
  "& .MuiInputLabel-root": { fontSize: 13, fontWeight: 500, color: "#64748b" },
  "& .MuiInputLabel-root:not(.MuiInputLabel-shrink)": { transform: "translate(14px, 14px) scale(1)", lineHeight: "20px" },
  "& .MuiInputLabel-root.Mui-focused": { color: "#1e3a8a" },
  "& .MuiInputLabel-root.Mui-error": { color: "#dc2626" },
  "& .MuiOutlinedInput-root": {
    borderRadius: 8,
    backgroundColor: "#fff",
    fontSize: 14,
    lineHeight: 1.7,
    color: "#253047",
    "&:not(.MuiInputBase-multiline)": {
      height: 48,
      "& .MuiOutlinedInput-input": { height: 24, lineHeight: "24px" },
    },
    "& .MuiOutlinedInput-notchedOutline": { borderColor: "#dbe2ea" },
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#94a3b8" },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#1e3a8a", borderWidth: 2 },
    "&.Mui-error .MuiOutlinedInput-notchedOutline": { borderColor: "#dc2626" },
    "&:has(input[readonly]), &:has(textarea[readonly])": { backgroundColor: "#f8fafc", color: "#475569" },
  },
  "& .MuiOutlinedInput-input": { padding: "12px 14px" },
  "& .MuiInputBase-adornedStart .MuiOutlinedInput-input": { paddingLeft: 0 },
  "& .MuiOutlinedInput-root.MuiInputBase-multiline": { padding: "14px 16px" },
  "& .MuiInputBase-multiline .MuiOutlinedInput-input": { padding: 0 },
  "& .MuiFormHelperText-root": { margin: "7px 0 0", fontSize: 11.5, lineHeight: 1.6 },
});

/** App-level input styling built on MUI's accessible fields and validation states. */
export function FormTextField(props: TextFieldProps) {
  return <StyledTextField fullWidth size="small" variant="outlined" {...props} />;
}
