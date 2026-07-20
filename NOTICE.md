# Composants tiers et licences (NOTICE)

L'extension **Facture Schematron Validator** est distribuée sous licence MIT
(voir [`LICENSE`](LICENSE)). Elle embarque toutefois des artefacts de validation
et un moteur d'exécution produits par des tiers, chacun régi par sa propre
licence. Ces composants ne sont **pas** couverts par la licence MIT du projet.

| Composant | Emplacement | Origine | Licence |
|---|---|---|---|
| **Saxon-HE 10.9** (moteur XSLT 2.0) | `lib/saxon-he-10.9.jar` | Saxonica | Mozilla Public License 2.0 |
| **Schematron EN 16931** (UBL / CII) | `validation-artifacts/schematron/en16931-*` | [ConnectingEurope/eInvoicing-EN16931](https://github.com/ConnectingEurope/eInvoicing-EN16931) | Apache-2.0 / EUPL-1.2 selon les composants |
| **Règles Peppol BIS 3.0** | `validation-artifacts/schematron/peppol-ubl` | [OpenPeppol](https://docs.peppol.eu/) | Licence OpenPeppol |
| **Règles françaises FNFE-MPE** (BR-FR-CTC, XP Z12-012) | `validation-artifacts/schematron/fr`, `custom-src` | [fnfempe/France_RFE](https://github.com/fnfempe/France_RFE) (tag `FNFE_RFE_INVOICE_1.4.0`) | Voir les en-têtes des fichiers `.sch` |
| **Squelette ISO Schematron** (pipeline `.sch` → XSLT) | `tools/iso-schematron/` | ISO/Schematron.com | Licence permissive (voir en-têtes) |
| **Schémas XSD UBL 2.1** | `validation-artifacts/xsd/ubl-2.1`, `xsd-ubl-2.1` | OASIS | Licence OASIS IPR |
| **Schémas XSD CII D16B** | `validation-artifacts/xsd/cii-d16b` | UN/CEFACT | Licence UN/CEFACT |
| **pdf-lib** (extraction Factur-X) | dépendance npm | [pdf-lib](https://github.com/Hopding/pdf-lib) | MIT |

## Remarques

- Les jeux de règles EN 16931 et Peppol sont mis à jour **trimestriellement** par
  leurs éditeurs. Utilisez `scripts/download-artifacts.sh` pour récupérer les
  dernières versions officielles.
- Les règles françaises embarquées correspondent au Schematron FNFE-MPE
  **v1.4.0 du 30/06/2026**. Ces textes évoluent : reportez-vous toujours à la
  release officielle du FNFE-MPE en cas de doute.
- La traduction française des messages EN 16931
  (`validation-artifacts/i18n/fr.json`) est produite par ce projet et distribuée
  sous licence MIT ; il s'agit d'une traduction **non officielle**.

En cas de redistribution de l'extension packagée (`.vsix`), conservez ce fichier
NOTICE ainsi que les en-têtes de licence des artefacts embarqués.
