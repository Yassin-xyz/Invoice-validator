<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xsl:stylesheet xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
                xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
                xmlns:iso="http://purl.oclc.org/dsdl/schematron"
                xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
                xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
                xmlns:saxon="http://saxon.sf.net/"
                xmlns:schold="http://www.ascc.net/xml/schematron"
                xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"
                xmlns:xhtml="http://www.w3.org/1999/xhtml"
                xmlns:xs="http://www.w3.org/2001/XMLSchema"
                xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                version="2.0"><!--Implementers: please note that overriding process-prolog or process-root is 
    the preferred method for meta-stylesheets to use where possible. -->
   <xsl:param name="archiveDirParameter"/>
   <xsl:param name="archiveNameParameter"/>
   <xsl:param name="fileNameParameter"/>
   <xsl:param name="fileDirParameter"/>
   <xsl:variable name="document-uri">
      <xsl:value-of select="document-uri(/)"/>
   </xsl:variable>
   <!--PHASES-->
   <!--PROLOG-->
   <xsl:output xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
               method="xml"
               omit-xml-declaration="no"
               standalone="yes"
               indent="yes"/>
   <!--XSD TYPES FOR XSLT2-->
   <!--KEYS AND FUNCTIONS-->
   <!--DEFAULT RULES-->
   <!--MODE: SCHEMATRON-SELECT-FULL-PATH-->
   <!--This mode can be used to generate an ugly though full XPath for locators-->
   <xsl:template match="*" mode="schematron-select-full-path">
      <xsl:apply-templates select="." mode="schematron-get-full-path"/>
   </xsl:template>
   <!--MODE: SCHEMATRON-FULL-PATH-->
   <!--This mode can be used to generate an ugly though full XPath for locators-->
   <xsl:template match="*" mode="schematron-get-full-path">
      <xsl:apply-templates select="parent::*" mode="schematron-get-full-path"/>
      <xsl:text>/</xsl:text>
      <xsl:choose>
         <xsl:when test="namespace-uri()=''">
            <xsl:value-of select="name()"/>
         </xsl:when>
         <xsl:otherwise>
            <xsl:text>*:</xsl:text>
            <xsl:value-of select="local-name()"/>
            <xsl:text>[namespace-uri()='</xsl:text>
            <xsl:value-of select="namespace-uri()"/>
            <xsl:text>']</xsl:text>
         </xsl:otherwise>
      </xsl:choose>
      <xsl:variable name="preceding"
                    select="count(preceding-sibling::*[local-name()=local-name(current())                                   and namespace-uri() = namespace-uri(current())])"/>
      <xsl:text>[</xsl:text>
      <xsl:value-of select="1+ $preceding"/>
      <xsl:text>]</xsl:text>
   </xsl:template>
   <xsl:template match="@*" mode="schematron-get-full-path">
      <xsl:apply-templates select="parent::*" mode="schematron-get-full-path"/>
      <xsl:text>/</xsl:text>
      <xsl:choose>
         <xsl:when test="namespace-uri()=''">@<xsl:value-of select="name()"/>
         </xsl:when>
         <xsl:otherwise>
            <xsl:text>@*[local-name()='</xsl:text>
            <xsl:value-of select="local-name()"/>
            <xsl:text>' and namespace-uri()='</xsl:text>
            <xsl:value-of select="namespace-uri()"/>
            <xsl:text>']</xsl:text>
         </xsl:otherwise>
      </xsl:choose>
   </xsl:template>
   <!--MODE: SCHEMATRON-FULL-PATH-2-->
   <!--This mode can be used to generate prefixed XPath for humans-->
   <xsl:template match="node() | @*" mode="schematron-get-full-path-2">
      <xsl:for-each select="ancestor-or-self::*">
         <xsl:text>/</xsl:text>
         <xsl:value-of select="name(.)"/>
         <xsl:if test="preceding-sibling::*[name(.)=name(current())]">
            <xsl:text>[</xsl:text>
            <xsl:value-of select="count(preceding-sibling::*[name(.)=name(current())])+1"/>
            <xsl:text>]</xsl:text>
         </xsl:if>
      </xsl:for-each>
      <xsl:if test="not(self::*)">
         <xsl:text/>/@<xsl:value-of select="name(.)"/>
      </xsl:if>
   </xsl:template>
   <!--MODE: SCHEMATRON-FULL-PATH-3-->
   <!--This mode can be used to generate prefixed XPath for humans 
	(Top-level element has index)-->
   <xsl:template match="node() | @*" mode="schematron-get-full-path-3">
      <xsl:for-each select="ancestor-or-self::*">
         <xsl:text>/</xsl:text>
         <xsl:value-of select="name(.)"/>
         <xsl:if test="parent::*">
            <xsl:text>[</xsl:text>
            <xsl:value-of select="count(preceding-sibling::*[name(.)=name(current())])+1"/>
            <xsl:text>]</xsl:text>
         </xsl:if>
      </xsl:for-each>
      <xsl:if test="not(self::*)">
         <xsl:text/>/@<xsl:value-of select="name(.)"/>
      </xsl:if>
   </xsl:template>
   <!--MODE: GENERATE-ID-FROM-PATH -->
   <xsl:template match="/" mode="generate-id-from-path"/>
   <xsl:template match="text()" mode="generate-id-from-path">
      <xsl:apply-templates select="parent::*" mode="generate-id-from-path"/>
      <xsl:value-of select="concat('.text-', 1+count(preceding-sibling::text()), '-')"/>
   </xsl:template>
   <xsl:template match="comment()" mode="generate-id-from-path">
      <xsl:apply-templates select="parent::*" mode="generate-id-from-path"/>
      <xsl:value-of select="concat('.comment-', 1+count(preceding-sibling::comment()), '-')"/>
   </xsl:template>
   <xsl:template match="processing-instruction()" mode="generate-id-from-path">
      <xsl:apply-templates select="parent::*" mode="generate-id-from-path"/>
      <xsl:value-of select="concat('.processing-instruction-', 1+count(preceding-sibling::processing-instruction()), '-')"/>
   </xsl:template>
   <xsl:template match="@*" mode="generate-id-from-path">
      <xsl:apply-templates select="parent::*" mode="generate-id-from-path"/>
      <xsl:value-of select="concat('.@', name())"/>
   </xsl:template>
   <xsl:template match="*" mode="generate-id-from-path" priority="-0.5">
      <xsl:apply-templates select="parent::*" mode="generate-id-from-path"/>
      <xsl:text>.</xsl:text>
      <xsl:value-of select="concat('.',name(),'-',1+count(preceding-sibling::*[name()=name(current())]),'-')"/>
   </xsl:template>
   <!--MODE: GENERATE-ID-2 -->
   <xsl:template match="/" mode="generate-id-2">U</xsl:template>
   <xsl:template match="*" mode="generate-id-2" priority="2">
      <xsl:text>U</xsl:text>
      <xsl:number level="multiple" count="*"/>
   </xsl:template>
   <xsl:template match="node()" mode="generate-id-2">
      <xsl:text>U.</xsl:text>
      <xsl:number level="multiple" count="*"/>
      <xsl:text>n</xsl:text>
      <xsl:number count="node()"/>
   </xsl:template>
   <xsl:template match="@*" mode="generate-id-2">
      <xsl:text>U.</xsl:text>
      <xsl:number level="multiple" count="*"/>
      <xsl:text>_</xsl:text>
      <xsl:value-of select="string-length(local-name(.))"/>
      <xsl:text>_</xsl:text>
      <xsl:value-of select="translate(name(),':','.')"/>
   </xsl:template>
   <!--Strip characters-->
   <xsl:template match="text()" priority="-1"/>
   <!--SCHEMA SETUP-->
   <xsl:template match="/">
      <svrl:schematron-output xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                              title="Contrôles complémentaires — cohérences arithmétiques et techniques (UBL + CII)"
                              schemaVersion="">
         <xsl:comment>
            <xsl:value-of select="$archiveDirParameter"/>   
		 <xsl:value-of select="$archiveNameParameter"/>  
		 <xsl:value-of select="$fileNameParameter"/>  
		 <xsl:value-of select="$fileDirParameter"/>
         </xsl:comment>
         <svrl:ns-prefix-in-attribute-values uri="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
                                             prefix="cac"/>
         <svrl:ns-prefix-in-attribute-values uri="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
                                             prefix="cbc"/>
         <svrl:ns-prefix-in-attribute-values uri="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
                                             prefix="rsm"/>
         <svrl:ns-prefix-in-attribute-values uri="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
                                             prefix="ram"/>
         <svrl:ns-prefix-in-attribute-values uri="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"
                                             prefix="udt"/>
         <svrl:ns-prefix-in-attribute-values uri="http://www.w3.org/2001/XMLSchema" prefix="xs"/>
         <svrl:active-pattern>
            <xsl:attribute name="document">
               <xsl:value-of select="document-uri(/)"/>
            </xsl:attribute>
            <xsl:attribute name="id">TECH</xsl:attribute>
            <xsl:attribute name="name">TECH</xsl:attribute>
            <xsl:apply-templates/>
         </svrl:active-pattern>
         <xsl:apply-templates select="/" mode="M8"/>
         <svrl:active-pattern>
            <xsl:attribute name="document">
               <xsl:value-of select="document-uri(/)"/>
            </xsl:attribute>
            <xsl:attribute name="id">PRIX-UBL</xsl:attribute>
            <xsl:attribute name="name">PRIX-UBL</xsl:attribute>
            <xsl:apply-templates/>
         </svrl:active-pattern>
         <xsl:apply-templates select="/" mode="M9"/>
         <svrl:active-pattern>
            <xsl:attribute name="document">
               <xsl:value-of select="document-uri(/)"/>
            </xsl:attribute>
            <xsl:attribute name="id">PRIX-CII</xsl:attribute>
            <xsl:attribute name="name">PRIX-CII</xsl:attribute>
            <xsl:apply-templates/>
         </svrl:active-pattern>
         <xsl:apply-templates select="/" mode="M10"/>
         <svrl:active-pattern>
            <xsl:attribute name="document">
               <xsl:value-of select="document-uri(/)"/>
            </xsl:attribute>
            <xsl:attribute name="id">MONTANT-UBL</xsl:attribute>
            <xsl:attribute name="name">MONTANT-UBL</xsl:attribute>
            <xsl:apply-templates/>
         </svrl:active-pattern>
         <xsl:apply-templates select="/" mode="M11"/>
         <svrl:active-pattern>
            <xsl:attribute name="document">
               <xsl:value-of select="document-uri(/)"/>
            </xsl:attribute>
            <xsl:attribute name="id">MONTANT-CII</xsl:attribute>
            <xsl:attribute name="name">MONTANT-CII</xsl:attribute>
            <xsl:apply-templates/>
         </svrl:active-pattern>
         <xsl:apply-templates select="/" mode="M12"/>
         <svrl:active-pattern>
            <xsl:attribute name="document">
               <xsl:value-of select="document-uri(/)"/>
            </xsl:attribute>
            <xsl:attribute name="id">UNITE</xsl:attribute>
            <xsl:attribute name="name">UNITE</xsl:attribute>
            <xsl:apply-templates/>
         </svrl:active-pattern>
         <xsl:apply-templates select="/" mode="M13"/>
         <svrl:active-pattern>
            <xsl:attribute name="document">
               <xsl:value-of select="document-uri(/)"/>
            </xsl:attribute>
            <xsl:attribute name="id">ID</xsl:attribute>
            <xsl:attribute name="name">ID</xsl:attribute>
            <xsl:apply-templates/>
         </svrl:active-pattern>
         <xsl:apply-templates select="/" mode="M14"/>
      </svrl:schematron-output>
   </xsl:template>
   <!--SCHEMATRON PATTERNS-->
   <svrl:text xmlns:svrl="http://purl.oclc.org/dsdl/svrl">Contrôles complémentaires — cohérences arithmétiques et techniques (UBL + CII)</svrl:text>
   <xsl:param name="tolerance" select="0.0001"/>
   <!--PATTERN TECH-->
   <!--RULE -->
   <xsl:template match="cbc:*[matches(local-name(), '(Amount|Quantity|Percent)$')]                  | ram:*[matches(local-name(), '(Amount|Quantity|Percent|Measure)$')]"
                 priority="1000"
                 mode="M8">
      <svrl:fired-rule xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                       context="cbc:*[matches(local-name(), '(Amount|Quantity|Percent)$')]                  | ram:*[matches(local-name(), '(Amount|Quantity|Percent|Measure)$')]"/>
      <!--ASSERT -->
      <xsl:choose>
         <xsl:when test="not(normalize-space(.) = ('null', 'NULL', 'None', 'undefined') or normalize-space(.) = '')"/>
         <xsl:otherwise>
            <svrl:failed-assert xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                                test="not(normalize-space(.) = ('null', 'NULL', 'None', 'undefined') or normalize-space(.) = '')">
               <xsl:attribute name="id">TECH-01</xsl:attribute>
               <xsl:attribute name="flag">fatal</xsl:attribute>
               <xsl:attribute name="location">
                  <xsl:apply-templates select="." mode="schematron-select-full-path"/>
               </xsl:attribute>
               <svrl:text>
[TECH-01] L'élément &lt;<xsl:text/>
                  <xsl:value-of select="name(.)"/>
                  <xsl:text/>&gt; (chemin <xsl:text/>
                  <xsl:value-of select="string-join(for $a in ancestor-or-self::* return name($a), '/')"/>
                  <xsl:text/>)
contient « <xsl:text/>
                  <xsl:value-of select="normalize-space(.)"/>
                  <xsl:text/> » au lieu d'une valeur numérique.
Cette valeur ferait échouer les moteurs de validation EN 16931 : corriger l'émission ERP avant tout autre contrôle.</svrl:text>
            </svrl:failed-assert>
         </xsl:otherwise>
      </xsl:choose>
      <xsl:apply-templates select="*" mode="M8"/>
   </xsl:template>
   <xsl:template match="text()" priority="-1" mode="M8"/>
   <xsl:template match="@*|node()" priority="-2" mode="M8">
      <xsl:apply-templates select="*" mode="M8"/>
   </xsl:template>
   <!--PATTERN PRIX-UBL-->
   <!--RULE -->
   <xsl:template match="cac:Price[cac:AllowanceCharge/cbc:BaseAmount]"
                 priority="1001"
                 mode="M9">
      <svrl:fired-rule xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                       context="cac:Price[cac:AllowanceCharge/cbc:BaseAmount]"/>
      <xsl:variable name="net" select="cbc:PriceAmount"/>
      <xsl:variable name="brut" select="cac:AllowanceCharge/cbc:BaseAmount"/>
      <xsl:variable name="rab" select="(cac:AllowanceCharge/cbc:Amount, 0)[1]"/>
      <xsl:variable name="ok"
                    select="$net castable as xs:decimal and $brut castable as xs:decimal and $rab castable as xs:decimal"/>
      <xsl:variable name="attendu"
                    select="if ($ok) then xs:decimal($brut) - xs:decimal($rab) else 0"/>
      <!--ASSERT -->
      <xsl:choose>
         <xsl:when test="not($ok) or abs(xs:decimal($net) - $attendu) le $tolerance"/>
         <xsl:otherwise>
            <svrl:failed-assert xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                                test="not($ok) or abs(xs:decimal($net) - $attendu) le $tolerance">
               <xsl:attribute name="id">PRIX-01</xsl:attribute>
               <xsl:attribute name="location">
                  <xsl:apply-templates select="." mode="schematron-select-full-path"/>
               </xsl:attribute>
               <svrl:text>
[PRIX-01] Prix unitaire incohérent : prix brut (BT-148) = <xsl:text/>
                  <xsl:value-of select="$brut"/>
                  <xsl:text/>,
rabais (BT-147) = <xsl:text/>
                  <xsl:value-of select="$rab"/>
                  <xsl:text/>, prix net déclaré (BT-146) = <xsl:text/>
                  <xsl:value-of select="$net"/>
                  <xsl:text/>,
prix net attendu = <xsl:text/>
                  <xsl:value-of select="$attendu"/>
                  <xsl:text/> (chemin <xsl:text/>
                  <xsl:value-of select="string-join(for $a in ancestor-or-self::* return name($a), '/')"/>
                  <xsl:text/>).</svrl:text>
            </svrl:failed-assert>
         </xsl:otherwise>
      </xsl:choose>
      <!--ASSERT -->
      <xsl:choose>
         <xsl:when test="not($rab castable as xs:decimal) or xs:decimal($rab) ge 0"/>
         <xsl:otherwise>
            <svrl:failed-assert xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                                test="not($rab castable as xs:decimal) or xs:decimal($rab) ge 0">
               <xsl:attribute name="id">PRIX-02</xsl:attribute>
               <xsl:attribute name="location">
                  <xsl:apply-templates select="." mode="schematron-select-full-path"/>
               </xsl:attribute>
               <svrl:text>
[PRIX-02] Le rabais unitaire (BT-147) est négatif : <xsl:text/>
                  <xsl:value-of select="$rab"/>
                  <xsl:text/>. Un rabais doit être positif ou nul.</svrl:text>
            </svrl:failed-assert>
         </xsl:otherwise>
      </xsl:choose>
      <!--ASSERT -->
      <xsl:choose>
         <xsl:when test="not($ok) or not(xs:decimal($net) = xs:decimal($brut) and xs:decimal($rab) = 0)"/>
         <xsl:otherwise>
            <svrl:failed-assert xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                                test="not($ok) or not(xs:decimal($net) = xs:decimal($brut) and xs:decimal($rab) = 0)">
               <xsl:attribute name="id">PRIX-04</xsl:attribute>
               <xsl:attribute name="flag">warning</xsl:attribute>
               <xsl:attribute name="location">
                  <xsl:apply-templates select="." mode="schematron-select-full-path"/>
               </xsl:attribute>
               <svrl:text>
[PRIX-04] Prix brut (BT-148) redondant : égal au prix net (<xsl:text/>
                  <xsl:value-of select="$net"/>
                  <xsl:text/>) sans rabais.
Le bloc de prix brut devrait être supprimé.</svrl:text>
            </svrl:failed-assert>
         </xsl:otherwise>
      </xsl:choose>
      <xsl:apply-templates select="*" mode="M9"/>
   </xsl:template>
   <!--RULE -->
   <xsl:template match="cac:Price/cbc:BaseQuantity" priority="1000" mode="M9">
      <svrl:fired-rule xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                       context="cac:Price/cbc:BaseQuantity"/>
      <!--ASSERT -->
      <xsl:choose>
         <xsl:when test="not(. castable as xs:decimal) or xs:decimal(.) gt 0"/>
         <xsl:otherwise>
            <svrl:failed-assert xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                                test="not(. castable as xs:decimal) or xs:decimal(.) gt 0">
               <xsl:attribute name="id">PRIX-03</xsl:attribute>
               <xsl:attribute name="location">
                  <xsl:apply-templates select="." mode="schematron-select-full-path"/>
               </xsl:attribute>
               <svrl:text>
[PRIX-03] La quantité de base du prix (BT-149) doit être strictement positive ; valeur trouvée : « <xsl:text/>
                  <xsl:value-of select="."/>
                  <xsl:text/> »
(risque de division par zéro dans le calcul du montant de ligne).</svrl:text>
            </svrl:failed-assert>
         </xsl:otherwise>
      </xsl:choose>
      <xsl:apply-templates select="*" mode="M9"/>
   </xsl:template>
   <xsl:template match="text()" priority="-1" mode="M9"/>
   <xsl:template match="@*|node()" priority="-2" mode="M9">
      <xsl:apply-templates select="*" mode="M9"/>
   </xsl:template>
   <!--PATTERN PRIX-CII-->
   <!--RULE -->
   <xsl:template match="ram:SpecifiedLineTradeAgreement[ram:GrossPriceProductTradePrice/ram:ChargeAmount]"
                 priority="1001"
                 mode="M10">
      <svrl:fired-rule xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                       context="ram:SpecifiedLineTradeAgreement[ram:GrossPriceProductTradePrice/ram:ChargeAmount]"/>
      <xsl:variable name="net" select="ram:NetPriceProductTradePrice/ram:ChargeAmount"/>
      <xsl:variable name="brut" select="ram:GrossPriceProductTradePrice/ram:ChargeAmount"/>
      <xsl:variable name="rab"
                    select="(ram:GrossPriceProductTradePrice/ram:AppliedTradeAllowanceCharge/ram:ActualAmount, 0)[1]"/>
      <xsl:variable name="ok"
                    select="$net castable as xs:decimal and $brut castable as xs:decimal and $rab castable as xs:decimal"/>
      <xsl:variable name="attendu"
                    select="if ($ok) then xs:decimal($brut) - xs:decimal($rab) else 0"/>
      <!--ASSERT -->
      <xsl:choose>
         <xsl:when test="not($ok) or abs(xs:decimal($net) - $attendu) le $tolerance"/>
         <xsl:otherwise>
            <svrl:failed-assert xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                                test="not($ok) or abs(xs:decimal($net) - $attendu) le $tolerance">
               <xsl:attribute name="id">PRIX-01</xsl:attribute>
               <xsl:attribute name="location">
                  <xsl:apply-templates select="." mode="schematron-select-full-path"/>
               </xsl:attribute>
               <svrl:text>
[PRIX-01] Prix unitaire incohérent : prix brut (BT-148) = <xsl:text/>
                  <xsl:value-of select="$brut"/>
                  <xsl:text/>,
rabais (BT-147) = <xsl:text/>
                  <xsl:value-of select="$rab"/>
                  <xsl:text/>, prix net déclaré (BT-146) = <xsl:text/>
                  <xsl:value-of select="$net"/>
                  <xsl:text/>,
prix net attendu = <xsl:text/>
                  <xsl:value-of select="$attendu"/>
                  <xsl:text/> (chemin <xsl:text/>
                  <xsl:value-of select="string-join(for $a in ancestor-or-self::* return name($a), '/')"/>
                  <xsl:text/>).</svrl:text>
            </svrl:failed-assert>
         </xsl:otherwise>
      </xsl:choose>
      <!--ASSERT -->
      <xsl:choose>
         <xsl:when test="not($rab castable as xs:decimal) or xs:decimal($rab) ge 0"/>
         <xsl:otherwise>
            <svrl:failed-assert xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                                test="not($rab castable as xs:decimal) or xs:decimal($rab) ge 0">
               <xsl:attribute name="id">PRIX-02</xsl:attribute>
               <xsl:attribute name="location">
                  <xsl:apply-templates select="." mode="schematron-select-full-path"/>
               </xsl:attribute>
               <svrl:text>
[PRIX-02] Le rabais unitaire (BT-147) est négatif : <xsl:text/>
                  <xsl:value-of select="$rab"/>
                  <xsl:text/>. Un rabais doit être positif ou nul.</svrl:text>
            </svrl:failed-assert>
         </xsl:otherwise>
      </xsl:choose>
      <!--ASSERT -->
      <xsl:choose>
         <xsl:when test="not($ok) or not(xs:decimal($net) = xs:decimal($brut) and xs:decimal($rab) = 0)"/>
         <xsl:otherwise>
            <svrl:failed-assert xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                                test="not($ok) or not(xs:decimal($net) = xs:decimal($brut) and xs:decimal($rab) = 0)">
               <xsl:attribute name="id">PRIX-04</xsl:attribute>
               <xsl:attribute name="flag">warning</xsl:attribute>
               <xsl:attribute name="location">
                  <xsl:apply-templates select="." mode="schematron-select-full-path"/>
               </xsl:attribute>
               <svrl:text>
[PRIX-04] Prix brut (BT-148) redondant : égal au prix net (<xsl:text/>
                  <xsl:value-of select="$net"/>
                  <xsl:text/>) sans rabais.
Le bloc de prix brut devrait être supprimé.</svrl:text>
            </svrl:failed-assert>
         </xsl:otherwise>
      </xsl:choose>
      <xsl:apply-templates select="*" mode="M10"/>
   </xsl:template>
   <!--RULE -->
   <xsl:template match="ram:NetPriceProductTradePrice/ram:BasisQuantity"
                 priority="1000"
                 mode="M10">
      <svrl:fired-rule xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                       context="ram:NetPriceProductTradePrice/ram:BasisQuantity"/>
      <!--ASSERT -->
      <xsl:choose>
         <xsl:when test="not(. castable as xs:decimal) or xs:decimal(.) gt 0"/>
         <xsl:otherwise>
            <svrl:failed-assert xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                                test="not(. castable as xs:decimal) or xs:decimal(.) gt 0">
               <xsl:attribute name="id">PRIX-03</xsl:attribute>
               <xsl:attribute name="location">
                  <xsl:apply-templates select="." mode="schematron-select-full-path"/>
               </xsl:attribute>
               <svrl:text>
[PRIX-03] La quantité de base du prix (BT-149) doit être strictement positive ; valeur trouvée : « <xsl:text/>
                  <xsl:value-of select="."/>
                  <xsl:text/> »
(risque de division par zéro dans le calcul du montant de ligne).</svrl:text>
            </svrl:failed-assert>
         </xsl:otherwise>
      </xsl:choose>
      <xsl:apply-templates select="*" mode="M10"/>
   </xsl:template>
   <xsl:template match="text()" priority="-1" mode="M10"/>
   <xsl:template match="@*|node()" priority="-2" mode="M10">
      <xsl:apply-templates select="*" mode="M10"/>
   </xsl:template>
   <!--PATTERN MONTANT-UBL-->
   <!--RULE -->
   <xsl:template match="cac:InvoiceLine[cac:Price/cbc:PriceAmount] | cac:CreditNoteLine[cac:Price/cbc:PriceAmount]"
                 priority="1000"
                 mode="M11">
      <svrl:fired-rule xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                       context="cac:InvoiceLine[cac:Price/cbc:PriceAmount] | cac:CreditNoteLine[cac:Price/cbc:PriceAmount]"/>
      <xsl:variable name="net" select="cac:Price/cbc:PriceAmount"/>
      <xsl:variable name="qty" select="(cbc:InvoicedQuantity | cbc:CreditedQuantity)[1]"/>
      <xsl:variable name="bq" select="(cac:Price/cbc:BaseQuantity, 1)[1]"/>
      <xsl:variable name="decl" select="cbc:LineExtensionAmount"/>
      <xsl:variable name="charges"
                    select="sum(for $c in cac:AllowanceCharge[normalize-space(cbc:ChargeIndicator) = 'true']/cbc:Amount[. castable as xs:decimal] return xs:decimal($c))"/>
      <xsl:variable name="remises"
                    select="sum(for $c in cac:AllowanceCharge[normalize-space(cbc:ChargeIndicator) = 'false']/cbc:Amount[. castable as xs:decimal] return xs:decimal($c))"/>
      <xsl:variable name="ok"
                    select="$net castable as xs:decimal and $qty castable as xs:decimal and $bq castable as xs:decimal                             and $decl castable as xs:decimal and ($bq castable as xs:decimal and xs:decimal($bq) ne 0)"/>
      <xsl:variable name="attendu"
                    select="if ($ok) then round((xs:decimal($net) div xs:decimal($bq) * xs:decimal($qty) + $charges - $remises) * 100) div 100 else 0"/>
      <!--ASSERT -->
      <xsl:choose>
         <xsl:when test="not($ok) or abs(xs:decimal($decl) - $attendu) le $tolerance"/>
         <xsl:otherwise>
            <svrl:failed-assert xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                                test="not($ok) or abs(xs:decimal($decl) - $attendu) le $tolerance">
               <xsl:attribute name="id">MONTANT-01</xsl:attribute>
               <xsl:attribute name="location">
                  <xsl:apply-templates select="." mode="schematron-select-full-path"/>
               </xsl:attribute>
               <svrl:text>
[MONTANT-01] Montant HT de ligne (BT-131) incohérent : déclaré = <xsl:text/>
                  <xsl:value-of select="$decl"/>
                  <xsl:text/>,
calculé = <xsl:text/>
                  <xsl:value-of select="$attendu"/>
                  <xsl:text/> (prix net <xsl:text/>
                  <xsl:value-of select="$net"/>
                  <xsl:text/> ÷ qté de base <xsl:text/>
                  <xsl:value-of select="$bq"/>
                  <xsl:text/>
× qté facturée <xsl:text/>
                  <xsl:value-of select="$qty"/>
                  <xsl:text/> + charges <xsl:text/>
                  <xsl:value-of select="$charges"/>
                  <xsl:text/> − remises <xsl:text/>
                  <xsl:value-of select="$remises"/>
                  <xsl:text/>, arrondi à 2 décimales)
(ligne <xsl:text/>
                  <xsl:value-of select="(cbc:ID, '?')[1]"/>
                  <xsl:text/>).</svrl:text>
            </svrl:failed-assert>
         </xsl:otherwise>
      </xsl:choose>
      <xsl:apply-templates select="*" mode="M11"/>
   </xsl:template>
   <xsl:template match="text()" priority="-1" mode="M11"/>
   <xsl:template match="@*|node()" priority="-2" mode="M11">
      <xsl:apply-templates select="*" mode="M11"/>
   </xsl:template>
   <!--PATTERN MONTANT-CII-->
   <!--RULE -->
   <xsl:template match="ram:IncludedSupplyChainTradeLineItem[ram:SpecifiedLineTradeAgreement/ram:NetPriceProductTradePrice/ram:ChargeAmount]"
                 priority="1000"
                 mode="M12">
      <svrl:fired-rule xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                       context="ram:IncludedSupplyChainTradeLineItem[ram:SpecifiedLineTradeAgreement/ram:NetPriceProductTradePrice/ram:ChargeAmount]"/>
      <xsl:variable name="net"
                    select="ram:SpecifiedLineTradeAgreement/ram:NetPriceProductTradePrice/ram:ChargeAmount"/>
      <xsl:variable name="qty" select="ram:SpecifiedLineTradeDelivery/ram:BilledQuantity"/>
      <xsl:variable name="bq"
                    select="(ram:SpecifiedLineTradeAgreement/ram:NetPriceProductTradePrice/ram:BasisQuantity, 1)[1]"/>
      <xsl:variable name="decl"
                    select="ram:SpecifiedLineTradeSettlement/ram:SpecifiedTradeSettlementLineMonetarySummation/ram:LineTotalAmount"/>
      <xsl:variable name="charges"
                    select="sum(for $c in ram:SpecifiedLineTradeSettlement/ram:SpecifiedTradeAllowanceCharge[normalize-space(ram:ChargeIndicator/udt:Indicator) = 'true']/ram:ActualAmount[. castable as xs:decimal] return xs:decimal($c))"/>
      <xsl:variable name="remises"
                    select="sum(for $c in ram:SpecifiedLineTradeSettlement/ram:SpecifiedTradeAllowanceCharge[normalize-space(ram:ChargeIndicator/udt:Indicator) = 'false']/ram:ActualAmount[. castable as xs:decimal] return xs:decimal($c))"/>
      <xsl:variable name="ok"
                    select="$net castable as xs:decimal and $qty castable as xs:decimal and $bq castable as xs:decimal                             and $decl castable as xs:decimal and ($bq castable as xs:decimal and xs:decimal($bq) ne 0)"/>
      <xsl:variable name="attendu"
                    select="if ($ok) then round((xs:decimal($net) div xs:decimal($bq) * xs:decimal($qty) + $charges - $remises) * 100) div 100 else 0"/>
      <!--ASSERT -->
      <xsl:choose>
         <xsl:when test="not($ok) or abs(xs:decimal($decl) - $attendu) le $tolerance"/>
         <xsl:otherwise>
            <svrl:failed-assert xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                                test="not($ok) or abs(xs:decimal($decl) - $attendu) le $tolerance">
               <xsl:attribute name="id">MONTANT-01</xsl:attribute>
               <xsl:attribute name="location">
                  <xsl:apply-templates select="." mode="schematron-select-full-path"/>
               </xsl:attribute>
               <svrl:text>
[MONTANT-01] Montant HT de ligne (BT-131) incohérent : déclaré = <xsl:text/>
                  <xsl:value-of select="$decl"/>
                  <xsl:text/>,
calculé = <xsl:text/>
                  <xsl:value-of select="$attendu"/>
                  <xsl:text/> (prix net <xsl:text/>
                  <xsl:value-of select="$net"/>
                  <xsl:text/> ÷ qté de base <xsl:text/>
                  <xsl:value-of select="$bq"/>
                  <xsl:text/>
× qté facturée <xsl:text/>
                  <xsl:value-of select="$qty"/>
                  <xsl:text/> + charges <xsl:text/>
                  <xsl:value-of select="$charges"/>
                  <xsl:text/> − remises <xsl:text/>
                  <xsl:value-of select="$remises"/>
                  <xsl:text/>, arrondi à 2 décimales)
(ligne <xsl:text/>
                  <xsl:value-of select="(ram:AssociatedDocumentLineDocument/ram:LineID, '?')[1]"/>
                  <xsl:text/>).</svrl:text>
            </svrl:failed-assert>
         </xsl:otherwise>
      </xsl:choose>
      <xsl:apply-templates select="*" mode="M12"/>
   </xsl:template>
   <xsl:template match="text()" priority="-1" mode="M12"/>
   <xsl:template match="@*|node()" priority="-2" mode="M12">
      <xsl:apply-templates select="*" mode="M12"/>
   </xsl:template>
   <!--PATTERN UNITE-->
   <!--RULE -->
   <xsl:template match="cac:InvoiceLine[cbc:InvoicedQuantity/@unitCode and cac:Price/cbc:BaseQuantity/@unitCode]                  | cac:CreditNoteLine[cbc:CreditedQuantity/@unitCode and cac:Price/cbc:BaseQuantity/@unitCode]"
                 priority="1001"
                 mode="M13">
      <svrl:fired-rule xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                       context="cac:InvoiceLine[cbc:InvoicedQuantity/@unitCode and cac:Price/cbc:BaseQuantity/@unitCode]                  | cac:CreditNoteLine[cbc:CreditedQuantity/@unitCode and cac:Price/cbc:BaseQuantity/@unitCode]"/>
      <!--ASSERT -->
      <xsl:choose>
         <xsl:when test="(cbc:InvoicedQuantity | cbc:CreditedQuantity)[1]/@unitCode = cac:Price/cbc:BaseQuantity/@unitCode"/>
         <xsl:otherwise>
            <svrl:failed-assert xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                                test="(cbc:InvoicedQuantity | cbc:CreditedQuantity)[1]/@unitCode = cac:Price/cbc:BaseQuantity/@unitCode">
               <xsl:attribute name="id">UNITE-01</xsl:attribute>
               <xsl:attribute name="flag">warning</xsl:attribute>
               <xsl:attribute name="location">
                  <xsl:apply-templates select="." mode="schematron-select-full-path"/>
               </xsl:attribute>
               <svrl:text>
[UNITE-01] Unités incohérentes : quantité facturée (BT-130) en « <xsl:text/>
                  <xsl:value-of select="(cbc:InvoicedQuantity | cbc:CreditedQuantity)[1]/@unitCode"/>
                  <xsl:text/> »
mais quantité de base du prix (BT-150) en « <xsl:text/>
                  <xsl:value-of select="cac:Price/cbc:BaseQuantity/@unitCode"/>
                  <xsl:text/> ».</svrl:text>
            </svrl:failed-assert>
         </xsl:otherwise>
      </xsl:choose>
      <xsl:apply-templates select="*" mode="M13"/>
   </xsl:template>
   <!--RULE -->
   <xsl:template match="ram:IncludedSupplyChainTradeLineItem[ram:SpecifiedLineTradeDelivery/ram:BilledQuantity/@unitCode                    and ram:SpecifiedLineTradeAgreement/ram:NetPriceProductTradePrice/ram:BasisQuantity/@unitCode]"
                 priority="1000"
                 mode="M13">
      <svrl:fired-rule xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                       context="ram:IncludedSupplyChainTradeLineItem[ram:SpecifiedLineTradeDelivery/ram:BilledQuantity/@unitCode                    and ram:SpecifiedLineTradeAgreement/ram:NetPriceProductTradePrice/ram:BasisQuantity/@unitCode]"/>
      <!--ASSERT -->
      <xsl:choose>
         <xsl:when test="ram:SpecifiedLineTradeDelivery/ram:BilledQuantity/@unitCode                     = ram:SpecifiedLineTradeAgreement/ram:NetPriceProductTradePrice/ram:BasisQuantity/@unitCode"/>
         <xsl:otherwise>
            <svrl:failed-assert xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                                test="ram:SpecifiedLineTradeDelivery/ram:BilledQuantity/@unitCode = ram:SpecifiedLineTradeAgreement/ram:NetPriceProductTradePrice/ram:BasisQuantity/@unitCode">
               <xsl:attribute name="id">UNITE-01</xsl:attribute>
               <xsl:attribute name="flag">warning</xsl:attribute>
               <xsl:attribute name="location">
                  <xsl:apply-templates select="." mode="schematron-select-full-path"/>
               </xsl:attribute>
               <svrl:text>
[UNITE-01] Unités incohérentes : quantité facturée (BT-130) en « <xsl:text/>
                  <xsl:value-of select="ram:SpecifiedLineTradeDelivery/ram:BilledQuantity/@unitCode"/>
                  <xsl:text/> »
mais quantité de base du prix (BT-150) en « <xsl:text/>
                  <xsl:value-of select="ram:SpecifiedLineTradeAgreement/ram:NetPriceProductTradePrice/ram:BasisQuantity/@unitCode"/>
                  <xsl:text/> ».</svrl:text>
            </svrl:failed-assert>
         </xsl:otherwise>
      </xsl:choose>
      <xsl:apply-templates select="*" mode="M13"/>
   </xsl:template>
   <xsl:template match="text()" priority="-1" mode="M13"/>
   <xsl:template match="@*|node()" priority="-2" mode="M13">
      <xsl:apply-templates select="*" mode="M13"/>
   </xsl:template>
   <!--PATTERN ID-->
   <!--RULE -->
   <xsl:template match="*[@schemeID = '0002'][normalize-space(.) != '']"
                 priority="1001"
                 mode="M14">
      <svrl:fired-rule xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                       context="*[@schemeID = '0002'][normalize-space(.) != '']"/>
      <xsl:variable name="n" select="normalize-space(.)"/>
      <xsl:variable name="fmt" select="matches($n, '^[0-9]{9}$')"/>
      <xsl:variable name="luhn"
                    select="$fmt and (sum(for $i in 1 to string-length($n)           return (if ((xs:integer(substring($n, $i, 1)) * (if (((string-length($n) - $i) mod 2) = 1) then 2 else 1)) gt 9)                   then (xs:integer(substring($n, $i, 1)) * 2) - 9                   else  xs:integer(substring($n, $i, 1)) * (if (((string-length($n) - $i) mod 2) = 1) then 2 else 1))) mod 10 = 0)"/>
      <!--ASSERT -->
      <xsl:choose>
         <xsl:when test="$fmt and $luhn"/>
         <xsl:otherwise>
            <svrl:failed-assert xmlns:svrl="http://purl.oclc.org/dsdl/svrl" test="$fmt and $luhn">
               <xsl:attribute name="id">ID-01-SIREN</xsl:attribute>
               <xsl:attribute name="location">
                  <xsl:apply-templates select="." mode="schematron-select-full-path"/>
               </xsl:attribute>
               <svrl:text>
[ID-01] SIREN invalide (schemeID 0002) : « <xsl:text/>
                  <xsl:value-of select="$n"/>
                  <xsl:text/> » —
<xsl:text/>
                  <xsl:value-of select="if (not($fmt)) then 'le format attendu est exactement 9 chiffres' else 'la clé de Luhn est incorrecte (numéro inexistant ou mal saisi)'"/>
                  <xsl:text/>
(élément &lt;<xsl:text/>
                  <xsl:value-of select="name(.)"/>
                  <xsl:text/>&gt;).</svrl:text>
            </svrl:failed-assert>
         </xsl:otherwise>
      </xsl:choose>
      <xsl:apply-templates select="*" mode="M14"/>
   </xsl:template>
   <!--RULE -->
   <xsl:template match="*[@schemeID = '0009'][normalize-space(.) != '']"
                 priority="1000"
                 mode="M14">
      <svrl:fired-rule xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                       context="*[@schemeID = '0009'][normalize-space(.) != '']"/>
      <xsl:variable name="n" select="normalize-space(.)"/>
      <xsl:variable name="fmt" select="matches($n, '^[0-9]{14}$')"/>
      <xsl:variable name="luhn"
                    select="$fmt and (sum(for $i in 1 to string-length($n)           return (if ((xs:integer(substring($n, $i, 1)) * (if (((string-length($n) - $i) mod 2) = 1) then 2 else 1)) gt 9)                   then (xs:integer(substring($n, $i, 1)) * 2) - 9                   else  xs:integer(substring($n, $i, 1)) * (if (((string-length($n) - $i) mod 2) = 1) then 2 else 1))) mod 10 = 0)"/>
      <!--ASSERT -->
      <xsl:choose>
         <xsl:when test="$fmt and $luhn"/>
         <xsl:otherwise>
            <svrl:failed-assert xmlns:svrl="http://purl.oclc.org/dsdl/svrl" test="$fmt and $luhn">
               <xsl:attribute name="id">ID-01-SIRET</xsl:attribute>
               <xsl:attribute name="location">
                  <xsl:apply-templates select="." mode="schematron-select-full-path"/>
               </xsl:attribute>
               <svrl:text>
[ID-01] SIRET invalide (schemeID 0009) : « <xsl:text/>
                  <xsl:value-of select="$n"/>
                  <xsl:text/> » —
<xsl:text/>
                  <xsl:value-of select="if (not($fmt)) then 'le format attendu est exactement 14 chiffres' else 'la clé de Luhn est incorrecte (numéro inexistant ou mal saisi)'"/>
                  <xsl:text/>
(élément &lt;<xsl:text/>
                  <xsl:value-of select="name(.)"/>
                  <xsl:text/>&gt;).</svrl:text>
            </svrl:failed-assert>
         </xsl:otherwise>
      </xsl:choose>
      <xsl:apply-templates select="*" mode="M14"/>
   </xsl:template>
   <xsl:template match="text()" priority="-1" mode="M14"/>
   <xsl:template match="@*|node()" priority="-2" mode="M14">
      <xsl:apply-templates select="*" mode="M14"/>
   </xsl:template>
</xsl:stylesheet>
