<?xml version="1.0" encoding="UTF-8"?>
<schema xmlns="http://purl.oclc.org/dsdl/schematron" queryBinding="xslt2">
  <title>Contrôles complémentaires — cohérences arithmétiques et techniques (UBL + CII)</title>

  <ns prefix="cac" uri="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"/>
  <ns prefix="cbc" uri="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"/>
  <ns prefix="rsm" uri="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"/>
  <ns prefix="ram" uri="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"/>
  <ns prefix="udt" uri="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"/>
  <ns prefix="xs"  uri="http://www.w3.org/2001/XMLSchema"/>

  <!-- Tolérance d'arrondi des comparaisons (PRIX-01, MONTANT-01).
       Convertie en xsl:param à la compilation : surchargable sans recompiler. -->
  <let name="tolerance" value="0.0001"/>

  <!-- ======================================================================
       TECH-01 : valeurs littérales non numériques (« null », vide…)
       Ce jeu est exécuté EN PREMIER dans la chaîne : si cette règle tire,
       les moteurs EN16931/Peppol risquent d'échouer à la conversion.
       ====================================================================== -->
  <pattern id="TECH">
    <rule context="cbc:*[matches(local-name(), '(Amount|Quantity|Percent)$')]
                 | ram:*[matches(local-name(), '(Amount|Quantity|Percent|Measure)$')]">
      <assert id="TECH-01" flag="fatal"
              test="not(normalize-space(.) = ('null', 'NULL', 'None', 'undefined') or normalize-space(.) = '')">
[TECH-01] L'élément &lt;<name/>&gt; (chemin <value-of select="string-join(for $a in ancestor-or-self::* return name($a), '/')"/>)
contient « <value-of select="normalize-space(.)"/> » au lieu d'une valeur numérique.
Cette valeur ferait échouer les moteurs de validation EN 16931 : corriger l'émission ERP avant tout autre contrôle.</assert>
    </rule>
  </pattern>

  <!-- ======================================================================
       PRIX : cohérence du prix unitaire (BT-146/147/148/149)
       ====================================================================== -->
  <pattern id="PRIX-UBL">
    <rule context="cac:Price[cac:AllowanceCharge/cbc:BaseAmount]">
      <let name="net"  value="cbc:PriceAmount"/>
      <let name="brut" value="cac:AllowanceCharge/cbc:BaseAmount"/>
      <let name="rab"  value="(cac:AllowanceCharge/cbc:Amount, 0)[1]"/>
      <let name="ok"   value="$net castable as xs:decimal and $brut castable as xs:decimal and $rab castable as xs:decimal"/>
      <let name="attendu" value="if ($ok) then xs:decimal($brut) - xs:decimal($rab) else 0"/>
      <assert id="PRIX-01"
              test="not($ok) or abs(xs:decimal($net) - $attendu) le $tolerance">
[PRIX-01] Prix unitaire incohérent : prix brut (BT-148) = <value-of select="$brut"/>,
rabais (BT-147) = <value-of select="$rab"/>, prix net déclaré (BT-146) = <value-of select="$net"/>,
prix net attendu = <value-of select="$attendu"/> (chemin <value-of select="string-join(for $a in ancestor-or-self::* return name($a), '/')"/>).</assert>
      <assert id="PRIX-02"
              test="not($rab castable as xs:decimal) or xs:decimal($rab) ge 0">
[PRIX-02] Le rabais unitaire (BT-147) est négatif : <value-of select="$rab"/>. Un rabais doit être positif ou nul.</assert>
      <assert id="PRIX-04" flag="warning"
              test="not($ok) or not(xs:decimal($net) = xs:decimal($brut) and xs:decimal($rab) = 0)">
[PRIX-04] Prix brut (BT-148) redondant : égal au prix net (<value-of select="$net"/>) sans rabais.
Le bloc de prix brut devrait être supprimé.</assert>
    </rule>
    <rule context="cac:Price/cbc:BaseQuantity">
      <assert id="PRIX-03"
              test="not(. castable as xs:decimal) or xs:decimal(.) gt 0">
[PRIX-03] La quantité de base du prix (BT-149) doit être strictement positive ; valeur trouvée : « <value-of select="."/> »
(risque de division par zéro dans le calcul du montant de ligne).</assert>
    </rule>
  </pattern>

  <pattern id="PRIX-CII">
    <rule context="ram:SpecifiedLineTradeAgreement[ram:GrossPriceProductTradePrice/ram:ChargeAmount]">
      <let name="net"  value="ram:NetPriceProductTradePrice/ram:ChargeAmount"/>
      <let name="brut" value="ram:GrossPriceProductTradePrice/ram:ChargeAmount"/>
      <let name="rab"  value="(ram:GrossPriceProductTradePrice/ram:AppliedTradeAllowanceCharge/ram:ActualAmount, 0)[1]"/>
      <let name="ok"   value="$net castable as xs:decimal and $brut castable as xs:decimal and $rab castable as xs:decimal"/>
      <let name="attendu" value="if ($ok) then xs:decimal($brut) - xs:decimal($rab) else 0"/>
      <assert id="PRIX-01"
              test="not($ok) or abs(xs:decimal($net) - $attendu) le $tolerance">
[PRIX-01] Prix unitaire incohérent : prix brut (BT-148) = <value-of select="$brut"/>,
rabais (BT-147) = <value-of select="$rab"/>, prix net déclaré (BT-146) = <value-of select="$net"/>,
prix net attendu = <value-of select="$attendu"/> (chemin <value-of select="string-join(for $a in ancestor-or-self::* return name($a), '/')"/>).</assert>
      <assert id="PRIX-02"
              test="not($rab castable as xs:decimal) or xs:decimal($rab) ge 0">
[PRIX-02] Le rabais unitaire (BT-147) est négatif : <value-of select="$rab"/>. Un rabais doit être positif ou nul.</assert>
      <assert id="PRIX-04" flag="warning"
              test="not($ok) or not(xs:decimal($net) = xs:decimal($brut) and xs:decimal($rab) = 0)">
[PRIX-04] Prix brut (BT-148) redondant : égal au prix net (<value-of select="$net"/>) sans rabais.
Le bloc de prix brut devrait être supprimé.</assert>
    </rule>
    <rule context="ram:NetPriceProductTradePrice/ram:BasisQuantity">
      <assert id="PRIX-03"
              test="not(. castable as xs:decimal) or xs:decimal(.) gt 0">
[PRIX-03] La quantité de base du prix (BT-149) doit être strictement positive ; valeur trouvée : « <value-of select="."/> »
(risque de division par zéro dans le calcul du montant de ligne).</assert>
    </rule>
  </pattern>

  <!-- ======================================================================
       MONTANT-01 : montant HT de ligne (BT-131)
       ====================================================================== -->
  <pattern id="MONTANT-UBL">
    <rule context="cac:InvoiceLine[cac:Price/cbc:PriceAmount] | cac:CreditNoteLine[cac:Price/cbc:PriceAmount]">
      <let name="net"  value="cac:Price/cbc:PriceAmount"/>
      <let name="qty"  value="(cbc:InvoicedQuantity | cbc:CreditedQuantity)[1]"/>
      <let name="bq"   value="(cac:Price/cbc:BaseQuantity, 1)[1]"/>
      <let name="decl" value="cbc:LineExtensionAmount"/>
      <let name="charges" value="sum(for $c in cac:AllowanceCharge[normalize-space(cbc:ChargeIndicator) = 'true']/cbc:Amount[. castable as xs:decimal] return xs:decimal($c))"/>
      <let name="remises" value="sum(for $c in cac:AllowanceCharge[normalize-space(cbc:ChargeIndicator) = 'false']/cbc:Amount[. castable as xs:decimal] return xs:decimal($c))"/>
      <let name="ok" value="$net castable as xs:decimal and $qty castable as xs:decimal and $bq castable as xs:decimal
                            and $decl castable as xs:decimal and ($bq castable as xs:decimal and xs:decimal($bq) ne 0)"/>
      <let name="attendu" value="if ($ok) then round((xs:decimal($net) div xs:decimal($bq) * xs:decimal($qty) + $charges - $remises) * 100) div 100 else 0"/>
      <assert id="MONTANT-01"
              test="not($ok) or abs(xs:decimal($decl) - $attendu) le $tolerance">
[MONTANT-01] Montant HT de ligne (BT-131) incohérent : déclaré = <value-of select="$decl"/>,
calculé = <value-of select="$attendu"/> (prix net <value-of select="$net"/> ÷ qté de base <value-of select="$bq"/>
× qté facturée <value-of select="$qty"/> + charges <value-of select="$charges"/> − remises <value-of select="$remises"/>, arrondi à 2 décimales)
(ligne <value-of select="(cbc:ID, '?')[1]"/>).</assert>
    </rule>
  </pattern>

  <pattern id="MONTANT-CII">
    <rule context="ram:IncludedSupplyChainTradeLineItem[ram:SpecifiedLineTradeAgreement/ram:NetPriceProductTradePrice/ram:ChargeAmount]">
      <let name="net"  value="ram:SpecifiedLineTradeAgreement/ram:NetPriceProductTradePrice/ram:ChargeAmount"/>
      <let name="qty"  value="ram:SpecifiedLineTradeDelivery/ram:BilledQuantity"/>
      <let name="bq"   value="(ram:SpecifiedLineTradeAgreement/ram:NetPriceProductTradePrice/ram:BasisQuantity, 1)[1]"/>
      <let name="decl" value="ram:SpecifiedLineTradeSettlement/ram:SpecifiedTradeSettlementLineMonetarySummation/ram:LineTotalAmount"/>
      <let name="charges" value="sum(for $c in ram:SpecifiedLineTradeSettlement/ram:SpecifiedTradeAllowanceCharge[normalize-space(ram:ChargeIndicator/udt:Indicator) = 'true']/ram:ActualAmount[. castable as xs:decimal] return xs:decimal($c))"/>
      <let name="remises" value="sum(for $c in ram:SpecifiedLineTradeSettlement/ram:SpecifiedTradeAllowanceCharge[normalize-space(ram:ChargeIndicator/udt:Indicator) = 'false']/ram:ActualAmount[. castable as xs:decimal] return xs:decimal($c))"/>
      <let name="ok" value="$net castable as xs:decimal and $qty castable as xs:decimal and $bq castable as xs:decimal
                            and $decl castable as xs:decimal and ($bq castable as xs:decimal and xs:decimal($bq) ne 0)"/>
      <let name="attendu" value="if ($ok) then round((xs:decimal($net) div xs:decimal($bq) * xs:decimal($qty) + $charges - $remises) * 100) div 100 else 0"/>
      <assert id="MONTANT-01"
              test="not($ok) or abs(xs:decimal($decl) - $attendu) le $tolerance">
[MONTANT-01] Montant HT de ligne (BT-131) incohérent : déclaré = <value-of select="$decl"/>,
calculé = <value-of select="$attendu"/> (prix net <value-of select="$net"/> ÷ qté de base <value-of select="$bq"/>
× qté facturée <value-of select="$qty"/> + charges <value-of select="$charges"/> − remises <value-of select="$remises"/>, arrondi à 2 décimales)
(ligne <value-of select="(ram:AssociatedDocumentLineDocument/ram:LineID, '?')[1]"/>).</assert>
    </rule>
  </pattern>

  <!-- ======================================================================
       UNITE-01 : cohérence des unités (BT-130 vs BT-150)
       ====================================================================== -->
  <pattern id="UNITE">
    <rule context="cac:InvoiceLine[cbc:InvoicedQuantity/@unitCode and cac:Price/cbc:BaseQuantity/@unitCode]
                 | cac:CreditNoteLine[cbc:CreditedQuantity/@unitCode and cac:Price/cbc:BaseQuantity/@unitCode]">
      <assert id="UNITE-01" flag="warning"
              test="(cbc:InvoicedQuantity | cbc:CreditedQuantity)[1]/@unitCode = cac:Price/cbc:BaseQuantity/@unitCode">
[UNITE-01] Unités incohérentes : quantité facturée (BT-130) en « <value-of select="(cbc:InvoicedQuantity | cbc:CreditedQuantity)[1]/@unitCode"/> »
mais quantité de base du prix (BT-150) en « <value-of select="cac:Price/cbc:BaseQuantity/@unitCode"/> ».</assert>
    </rule>
    <rule context="ram:IncludedSupplyChainTradeLineItem[ram:SpecifiedLineTradeDelivery/ram:BilledQuantity/@unitCode
                   and ram:SpecifiedLineTradeAgreement/ram:NetPriceProductTradePrice/ram:BasisQuantity/@unitCode]">
      <assert id="UNITE-01" flag="warning"
              test="ram:SpecifiedLineTradeDelivery/ram:BilledQuantity/@unitCode
                    = ram:SpecifiedLineTradeAgreement/ram:NetPriceProductTradePrice/ram:BasisQuantity/@unitCode">
[UNITE-01] Unités incohérentes : quantité facturée (BT-130) en « <value-of select="ram:SpecifiedLineTradeDelivery/ram:BilledQuantity/@unitCode"/> »
mais quantité de base du prix (BT-150) en « <value-of select="ram:SpecifiedLineTradeAgreement/ram:NetPriceProductTradePrice/ram:BasisQuantity/@unitCode"/> ».</assert>
    </rule>
  </pattern>

  <!-- ======================================================================
       ID-01 : clé de Luhn des SIREN (schemeID 0002) et SIRET (0009).
       Les contrôles de format 0225 (BR-FR-23) et de longueur des adresses
       électroniques (BR-FR-25) sont DÉJÀ portés par le jeu fr-ctc : non
       dupliqués ici, conformément au cahier des charges.
       ====================================================================== -->
  <pattern id="ID">
    <rule context="*[@schemeID = '0002'][normalize-space(.) != '']">
      <let name="n" value="normalize-space(.)"/>
      <let name="fmt" value="matches($n, '^[0-9]{9}$')"/>
      <let name="luhn" value="$fmt and (sum(for $i in 1 to string-length($n)
          return (if ((xs:integer(substring($n, $i, 1)) * (if (((string-length($n) - $i) mod 2) = 1) then 2 else 1)) gt 9)
                  then (xs:integer(substring($n, $i, 1)) * 2) - 9
                  else  xs:integer(substring($n, $i, 1)) * (if (((string-length($n) - $i) mod 2) = 1) then 2 else 1))) mod 10 = 0)"/>
      <assert id="ID-01-SIREN" test="$fmt and $luhn">
[ID-01] SIREN invalide (schemeID 0002) : « <value-of select="$n"/> » —
<value-of select="if (not($fmt)) then 'le format attendu est exactement 9 chiffres' else 'la clé de Luhn est incorrecte (numéro inexistant ou mal saisi)'"/>
(élément &lt;<name/>&gt;).</assert>
    </rule>
    <rule context="*[@schemeID = '0009'][normalize-space(.) != '']">
      <let name="n" value="normalize-space(.)"/>
      <let name="fmt" value="matches($n, '^[0-9]{14}$')"/>
      <let name="luhn" value="$fmt and (sum(for $i in 1 to string-length($n)
          return (if ((xs:integer(substring($n, $i, 1)) * (if (((string-length($n) - $i) mod 2) = 1) then 2 else 1)) gt 9)
                  then (xs:integer(substring($n, $i, 1)) * 2) - 9
                  else  xs:integer(substring($n, $i, 1)) * (if (((string-length($n) - $i) mod 2) = 1) then 2 else 1))) mod 10 = 0)"/>
      <assert id="ID-01-SIRET" test="$fmt and $luhn">
[ID-01] SIRET invalide (schemeID 0009) : « <value-of select="$n"/> » —
<value-of select="if (not($fmt)) then 'le format attendu est exactement 14 chiffres' else 'la clé de Luhn est incorrecte (numéro inexistant ou mal saisi)'"/>
(élément &lt;<name/>&gt;).</assert>
    </rule>
  </pattern>
</schema>
