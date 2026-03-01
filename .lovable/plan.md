

## Problem Analysis

The LaTeX compilation fails because:
1. **LLM generates broken preamble/commands** — despite instructions, the AI model sometimes outputs incompatible packages, malformed command definitions, or extra text
2. **Error parsing from YtoTech API is broken** — the error handler expects JSON with `log_files` but the actual response format differs, resulting in "Unknown compilation error" with no diagnostic info
3. **Regex-based fixes are fragile** — they catch some patterns but miss others (e.g., extra `\newcommand` redefinitions, wrong argument counts in custom commands, stray markdown)

## Solution: Preamble Replacement + Better Error Handling

### 1. `compile-latex` Edge Function — Major Rewrite

**Replace the LLM's entire preamble with a known-good one:**
- Extract only the content between `\begin{document}` and `\end{document}` from the LLM output
- Prepend a hardcoded, tested preamble (Jake's Resume template) that is guaranteed to compile
- This eliminates all preamble-related errors (bad packages, malformed `\newcommand`, etc.)

**Fix YtoTech error handling:**
- Log the full error response text (not just attempt JSON parse)
- Try multiple response formats (JSON, plain text)
- Return the first 500 chars of the error to the frontend for debugging
- Log the LaTeX code being sent so failures can be diagnosed

**Additional body sanitization:**
- Remove any stray markdown (`###`, `**`, `` ``` ``)
- Fix common LLM mistakes in the document body (double-arg `\resumeItem`, missing brace groups)
- Remove undefined/dangerous commands

### 2. `generate-resume` Edge Function — Minor Prompt Fix

- Add explicit instruction: "Do NOT redefine `\resumeItem`, `\resumeSubheading`, or any template commands — they are already defined in the preamble"
- Add: "Output ONLY the content between `\begin{document}` and `\end{document}`, the preamble will be provided automatically"

This shifts the LLM's job from "generate a full compilable LaTeX document" to "generate just the resume content using predefined commands" — significantly reducing failure modes.

### Technical Details

The known-good preamble includes all Jake's Resume commands:
- `\resumeSubheading{4 args}`, `\resumeItem{1 arg}`, `\resumeProjectHeading{2 args}`
- `\resumeSubHeadingListStart/End`, `\resumeItemListStart/End`
- Compatible packages only: `latexsym`, `fullpage`, `titlesec`, `enumitem`, `hyperref`, `babel`, `fontenc`, `inputenc`, `tabularx`

The body extraction uses: find `\begin{document}` and `\end{document}`, take everything between. If markers are missing, treat entire input as body content and wrap it.

