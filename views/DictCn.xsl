<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

    <xsl:template match="/">
        <xsl:apply-templates select="dict"/>
    </xsl:template>
    <xsl:template match="dict">
        <div class="dict-entry">
            <xsl:apply-templates/>
            <xsl:if test="sent">
                <h4>用法和例句：</h4>
                <ol class="dict-usage">
                    <xsl:for-each select="sent">
                        <li class="dict-example">
                            <p class="dict-example-orig">
                                <xsl:value-of disable-output-escaping="yes" select="orig"/>
                            </p>
                            <p class="dict-example-trans">
                                <xsl:value-of disable-output-escaping="yes" select="trans"/>
                            </p>
                        </li>
                    </xsl:for-each>
                </ol>
            </xsl:if>
        </div>
    </xsl:template>
    <!--<xsl:template match="key"><h2 class="hw"><xsl:value-of select="."/></h2></xsl:template>-->
    <xsl:template match="pron">
        <b>發音:</b><span class="pronunciation">[<xsl:value-of select="."/>]</span>
    </xsl:template>
    <xsl:template match="def">
        <div class="dict-definition"><pre><xsl:value-of select="."/></pre></div>
    </xsl:template>
    <xsl:template match="*"/>

</xsl:stylesheet>