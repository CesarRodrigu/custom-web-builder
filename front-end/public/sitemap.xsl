<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet
  version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
>
  <xsl:output method="html" encoding="UTF-8" indent="yes" />

  <xsl:template match="/">
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Sitemap</title>
        <style>
          body { font-family: system-ui, sans-serif; margin: 2rem auto; max-width: 64rem; padding: 0 1rem; }
          h1 { font-size: 1.5rem; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border-bottom: 1px solid #ddd; padding: .5rem; text-align: left; vertical-align: top; }
          a { color: #2563eb; }
        </style>
      </head>
      <body>
        <h1>Sitemap</h1>
        <xsl:apply-templates />
      </body>
    </html>
  </xsl:template>

  <xsl:template match="s:urlset">
    <table>
      <thead><tr><th>URL</th><th>Alternativas</th></tr></thead>
      <tbody>
        <xsl:for-each select="s:url">
          <tr>
            <td><a href="{s:loc}"><xsl:value-of select="s:loc" /></a></td>
            <td>
              <xsl:for-each select="xhtml:link">
                <a href="{@href}"><xsl:value-of select="@hreflang" /></a>
                <xsl:if test="position() != last()"><xsl:text> · </xsl:text></xsl:if>
              </xsl:for-each>
            </td>
          </tr>
        </xsl:for-each>
      </tbody>
    </table>
  </xsl:template>

  <xsl:template match="s:sitemapindex">
    <table>
      <thead><tr><th>Sitemap</th></tr></thead>
      <tbody>
        <xsl:for-each select="s:sitemap">
          <tr>
            <td><a href="{s:loc}"><xsl:value-of select="s:loc" /></a></td>
          </tr>
        </xsl:for-each>
      </tbody>
    </table>
  </xsl:template>
</xsl:stylesheet>
