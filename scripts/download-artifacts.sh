#!/usr/bin/env bash
# Télécharge / met à jour les artefacts de validation :
#  - Saxon-HE (si absent de lib/)
#  - Schematron EN 16931 officiels (UBL + CII), recompilés en XSLT
#  - Règles Peppol BIS Billing 3.0 (UBL)
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"
ART="$HERE/validation-artifacts/schematron"
mkdir -p "$ART/en16931-ubl" "$ART/en16931-cii" "$ART/peppol-ubl" "$ART/fr"

# --- Saxon-HE ---------------------------------------------------------------
if ! ls "$HERE"/lib/saxon*.jar >/dev/null 2>&1; then
  echo "Téléchargement de Saxon-HE 12 (Maven Central)…"
  mkdir -p "$HERE/lib"
  curl -sL -o "$HERE/lib/saxon-he-12.5.jar" \
    "https://repo1.maven.org/maven2/net/sf/saxon/Saxon-HE/12.5/Saxon-HE-12.5.jar"
fi
SAXON="$(ls "$HERE"/lib/saxon*.jar | head -1)"

# --- EN 16931 (CEF / ConnectingEurope) --------------------------------------
echo "Récupération des Schematron EN 16931 officiels…"
TMPD="$(mktemp -d)"
trap 'rm -rf "$TMPD"' EXIT
curl -sL -o "$TMPD/en16931.zip" \
  "https://codeload.github.com/ConnectingEurope/eInvoicing-EN16931/zip/refs/heads/master"
unzip -q "$TMPD/en16931.zip" -d "$TMPD"
SRCDIR="$TMPD/eInvoicing-EN16931-master"

compile() { # $1=.sch  $2=sortie.xslt
  local t1 t2
  t1="$(mktemp --suffix=.sch)"; t2="$(mktemp --suffix=.sch)"
  java -jar "$SAXON" -s:"$1" -xsl:"$HERE/tools/iso-schematron/iso_dsdl_include.xsl" -o:"$t1"
  java -jar "$SAXON" -s:"$t1" -xsl:"$HERE/tools/iso-schematron/iso_abstract_expand.xsl" -o:"$t2"
  java -jar "$SAXON" -s:"$t2" -xsl:"$HERE/tools/iso-schematron/iso_svrl_for_xslt2.xsl" -o:"$2"
  rm -f "$t1" "$t2"
}

compile "$SRCDIR/ubl/schematron/preprocessed/EN16931-UBL-validation-preprocessed.sch" \
        "$ART/en16931-ubl/EN16931-UBL-validation.xslt"
compile "$SRCDIR/cii/schematron/preprocessed/EN16931-CII-validation-preprocessed.sch" \
        "$ART/en16931-cii/EN16931-CII-validation.xslt"

# --- Peppol BIS Billing 3.0 --------------------------------------------------
echo "Récupération des règles Peppol BIS Billing 3.0 (UBL)…"
curl -sL -o "$ART/peppol-ubl/PEPPOL-EN16931-UBL.sch" \
  "https://raw.githubusercontent.com/OpenPEPPOL/peppol-bis-invoice-3/master/rules/sch/PEPPOL-EN16931-UBL.sch" \
  && compile "$ART/peppol-ubl/PEPPOL-EN16931-UBL.sch" "$ART/peppol-ubl/PEPPOL-EN16931-UBL.xslt" \
  || echo "⚠ Peppol non récupéré (URL à vérifier) — le XSLT embarqué reste utilisable."

echo "Terminé. Artefacts dans $ART"
echo "Pour les règles françaises : déposez le .sch des spécifications externes"
echo "dans $ART/fr puis compilez-le avec scripts/compile-schematron.sh."
