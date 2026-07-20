#!/usr/bin/env bash
# Compile un fichier Schematron (.sch) en XSLT exécutable par Saxon,
# via le squelette ISO Schematron embarqué dans tools/iso-schematron.
#
# Usage :
#   ./scripts/compile-schematron.sh chemin/vers/regles.sch chemin/vers/sortie.xslt
#
# Exemple (règles françaises de la réforme) :
#   ./scripts/compile-schematron.sh regles-fr-ctc.sch validation-artifacts/schematron/fr/regles-fr-ctc.xslt
# Puis ajoutez le chemin absolu du .xslt au paramètre
# "factureValidator.customSchematronXslt" de VS Code.

set -euo pipefail

if [ $# -ne 2 ]; then
  echo "Usage: $0 <entrée.sch> <sortie.xslt>" >&2
  exit 1
fi

SRC="$1"
OUT="$2"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
SKEL="$HERE/tools/iso-schematron"
SAXON="$(ls "$HERE"/lib/saxon*.jar 2>/dev/null | head -1)"

if [ -z "${SAXON:-}" ]; then
  echo "Saxon-HE introuvable dans lib/. Lancez scripts/download-artifacts.sh." >&2
  exit 1
fi

TMP1="$(mktemp --suffix=.sch)"
TMP2="$(mktemp --suffix=.sch)"
trap 'rm -f "$TMP1" "$TMP2"' EXIT

echo "1/3 Résolution des inclusions…"
java -jar "$SAXON" -s:"$SRC" -xsl:"$SKEL/iso_dsdl_include.xsl" -o:"$TMP1"

echo "2/3 Expansion des règles abstraites…"
java -jar "$SAXON" -s:"$TMP1" -xsl:"$SKEL/iso_abstract_expand.xsl" -o:"$TMP2"

echo "3/3 Génération du XSLT de validation (SVRL)…"
java -jar "$SAXON" -s:"$TMP2" -xsl:"$SKEL/iso_svrl_for_xslt2.xsl" -o:"$OUT"

echo "OK → $OUT"
