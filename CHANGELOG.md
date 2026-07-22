# Journal des modifications

Toutes les modifications notables de ce projet sont consignées dans ce fichier.

Le format s'inspire de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et le projet suit le [versionnage sémantique](https://semver.org/lang/fr/).

## [Non publié]

## [0.17.0] — 2026-07-22

### Modifié
- **L'extension s'appelle désormais « Invoice Validator »** : `displayName`,
  titre des paramètres, README et documentation alignés. Les identifiants de
  commandes et de paramètres (`factureValidator.*`) sont inchangés — aucune
  configuration existante n'est perdue.
- Identité de publication : éditeur `Invoicevalidator`, identifiant d'extension
  `Invoicevalidator.invoice-validator`.

### Ajouté
- **Icône de l'extension** (`media/icon.png`, 512×512) pour le Marketplace VS Code.
- Documentation de lancement open source : `LICENSE` (MIT), `NOTICE.md`
  (composants tiers et licences), `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`,
  `SECURITY.md`, modèles d'issues et de pull request, intégration continue.
- README réécrit pour le grand public : installation, démarrage rapide, tableau
  des commandes, référence de configuration, FAQ, limites et périmètre.

### Corrigé
- Suppression d'un dossier parasite (`{src…`) issu d'une expansion de shell.
- `package-lock.json` resynchronisé sur la version réelle du paquet.
- `.vscodeignore` : exclusion des fichiers de développement (`scripts/`,
  `tools/`, `.github/`) du paquet publié, après vérification qu'ils ne sont pas
  utilisés à l'exécution.

## [0.16.0] — 2026-07-20

### Ajouté
- **Validation en couches** : couche structurelle XSD (UBL 2.1 OASIS, CII D16B
  UN/CEFACT via classe Java précompilée) exécutée avant la couche sémantique
  Schematron. Désactivable via `factureValidator.xsdValidation`.
- **Règles françaises officielles** : Schematron FNFE-MPE v1.4.0 du 30/06/2026
  (BR-FR-CTC, profil EXTENDED-CTC-FR) en application de la norme AFNOR XP Z12-012.
- **Messages en français** : ~1560 règles EN 16931 et syntaxiques traduites
  (couverture 92 %, dont 100 % des règles métier BR-*), commutables via
  `factureValidator.messageLanguage`.
- **Annotation BT/BG/EXT** : commande d'annotation des balises (483 entrées
  cartographiées, dont 211 termes étendus EXT-FR) et sa commande inverse
  idempotente.
- **Inventaire des termes** : commande listant les BT/BG/EXT présents dans un
  document.
- **Contrôles complémentaires** (`controles-plus`) : contrôles arithmétiques et
  techniques bi-syntaxe (TECH-01, PRIX-01..04, MONTANT-01, UNITE-01, ID-01/Luhn),
  avec tolérance d'arrondi configurable.
- **Factur-X / ZUGFeRD** : extraction du XML embarqué dans le PDF hybride
  (`pdf-lib`) puis validation comme du CII.
- **Localisation des diagnostics** : placement des erreurs sur la balise exacte
  désignée par le XPath du rapport SVRL, avec carte BT → balise.
- Panneau « Contrôles électronique » (webview) et intégrations menus contextuels.

> Note : ce projet n'ayant pas encore été publié publiquement, l'entrée 0.16.0
> agrège l'ensemble des fonctionnalités développées jusqu'à la version indiquée
> dans `package.json`. Les prochaines versions seront détaillées incrément par
> incrément.

[Non publié]: https://github.com/Yassin-xyz/Invoice-validator/compare/v0.17.0...HEAD
[0.17.0]: https://github.com/Yassin-xyz/Invoice-validator/compare/v0.16.0...v0.17.0
[0.16.0]: https://github.com/Yassin-xyz/Invoice-validator/releases/tag/v0.16.0
