export type SupportedFormatLang =
  | "javascript"
  | "typescript"
  | "json"
  | "css"
  | "html"
  | "markdown";

const PARSER_MAP: Record<SupportedFormatLang, string> = {
  javascript: "babel",
  typescript: "typescript",
  json: "json",
  css: "css",
  html: "html",
  markdown: "markdown",
};

async function loadPlugins(parser: string) {
  const prettier = await import("prettier/standalone");

  if (parser === "babel" || parser === "json") {
    const [babel, estree] = await Promise.all([
      import("prettier/plugins/babel"),
      import("prettier/plugins/estree"),
    ]);
    return { prettier, plugins: [babel.default, estree.default] };
  }

  if (parser === "typescript") {
    const [ts, estree] = await Promise.all([
      import("prettier/plugins/typescript"),
      import("prettier/plugins/estree"),
    ]);
    return { prettier, plugins: [ts.default, estree.default] };
  }

  if (parser === "css") {
    const postcss = await import("prettier/plugins/postcss");
    return { prettier, plugins: [postcss.default] };
  }

  if (parser === "html") {
    const html = await import("prettier/plugins/html");
    return { prettier, plugins: [html.default] };
  }

  if (parser === "markdown") {
    const md = await import("prettier/plugins/markdown");
    return { prettier, plugins: [md.default] };
  }

  throw new Error(`No plugin for parser: ${parser}`);
}

export async function formatCodeBlock(
  content: string,
  language: SupportedFormatLang
): Promise<string> {
  const parser = PARSER_MAP[language];
  const { prettier, plugins } = await loadPlugins(parser);
  return prettier.format(content, { parser, plugins }) as Promise<string>;
}
