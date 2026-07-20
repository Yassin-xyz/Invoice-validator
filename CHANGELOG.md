# Journal des modifications

Toutes les modifications notables de ce projet sont consignées dans ce fichier.

Le format s'inspire de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et le projet suit le [versionnage sémantique](https://semver.org/lang/fr/).

## [Non publié]

### Ajouté
- Documentation de lancement open source : `LICENSE` (MIT), `NOTICE.md`,
  `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, templates GitHub et CI.

### Corrigé
- Suppression d'un dossier parasite (`{src…`) issu d'une expansion de shell.
- Renseignement du champ `publisher` dans `package.json`.

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

[Non publié]: https://github.com/Yassin.xyz/facture-schematron-validator/compare/v0.16.0...HEAD
[0.16.0]: https://github.com/Yassin.xyz/facture-schematron-validator/releases/tag/v0.16.0
