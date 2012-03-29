<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

    <xsl:template match="/">
        <xsl:apply-templates select="dict"/>
    </xsl:template>
    <xsl:template match="dict">
        <xsl:apply-templates/>
    </xsl:template>
    <xsl:template match="Key">
        <h2 class="hw"><xsl:value-of select="."/></h2>
    </xsl:template>
    <xsl:template match="ps">
        <div class="pronunciation"><xsl:value-of select="."/></div>
    </xsl:template>
    <xsl:template match="pos">
        <span class="partOfSpeech"><xsl:value-of select="."/></span>
    </xsl:template>
    <xsl:template match="acceptation">
        <span class="definition"><xsl:value-of select="."/></span>
    </xsl:template>
    <xsl:template match="sent">
        <div class="dict-example">
            <p class="dict-example-orig">
                <xsl:value-of select="orig"/>
            </p>
            <p class="dict-example-trans">
               <xsl:value-of select="trans"/>
            </p>
        </div>
    </xsl:template>
    <xsl:template match="*"/>
</xsl:stylesheet>