# Règles françaises (réforme de la facturation électronique)

**Déjà embarquées ici : Schematron officiels FNFE-MPE v1.4.0 (30/06/2026, norme XP Z12-012)**
dans `ubl/`, `cii/` et `facturx/` — jeux `fr-ctc`, `extended-ctc-fr`, `facturx-en16931`.
Source : https://github.com/fnfempe/France_RFE (tag FNFE_RFE_INVOICE_1.4.0).
Pour mettre à jour : téléchargez la nouvelle release et remplacez les .xslt.

## Où trouver les règles

- **Spécifications externes de la facturation électronique** publiées par
  l'AIFE / DGFiP (impots.gouv.fr) : règles de gestion du socle (cadres de
  facturation B2B, SIREN/SIRET, mentions obligatoires françaises, données
  du e-reporting, profil étendu au-delà de l'EN 16931…). Certaines annexes
  sont fournies ou déclinées en Schematron par l'écosystème.
- **FNFE-MPE** (Forum National de la Facture Électronique) : ressources
  Factur-X, dont les Schematron des profils Factur-X (MINIMUM, BASIC WL,
  BASIC, EN 16931, EXTENDED).
- **Peppol** : le profil français s'appuyant sur le réseau Peppol, les
  éventuelles règles CIUS/extension françaises publiées au format Schematron.

## Comment les utiliser

1. Déposez le fichier `.sch` dans ce dossier (ou n'importe où).
2. Compilez-le en XSLT :

   ```bash
   ./scripts/compile-schematron.sh validation-artifacts/schematron/fr/regles-fr.sch \
                                   validation-artifacts/schematron/fr/regles-fr.xslt
   ```

3. Dans les paramètres VS Code, ajoutez le chemin **absolu** du `.xslt` à
   `factureValidator.customSchematronXslt`. Il sera appliqué à chaque
   validation, en plus des jeux embarqués.

> Astuce : si la source est déjà fournie compilée en XSLT (c'est le cas de
> certains livrables), inutile de la compiler — référencez-la directement.
