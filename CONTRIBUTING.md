# Contribuer à Facture Schematron Validator

Merci de l'intérêt que vous portez au projet ! Ce guide décrit comment proposer
une amélioration, signaler un bug ou soumettre du code. Toute contribution —
correction de traduction, règle de validation, documentation, test — est la
bienvenue.

## Sommaire

- [Code de conduite](#code-de-conduite)
- [Comment contribuer](#comment-contribuer)
- [Mettre en place l'environnement](#mettre-en-place-lenvironnement)
- [Cycle de développement](#cycle-de-développement)
- [Conventions de code](#conventions-de-code)
- [Contribuer aux règles et traductions](#contribuer-aux-règles-et-traductions)
- [Convention de commits](#convention-de-commits)
- [Ouvrir une pull request](#ouvrir-une-pull-request)

## Code de conduite

Ce projet adopte un [Code de conduite](CODE_OF_CONDUCT.md). En participant, vous
vous engagez à le respecter. Merci de signaler tout comportement inacceptable à
l'adresse indiquée dans ce document.

## Comment contribuer

- **Signaler un bug** : ouvrez une [issue](https://github.com/Yassin-xyz/facture-schematron-validator/issues)
  en utilisant le modèle « Rapport de bug ». Joignez si possible un extrait de
  facture minimal reproduisant le problème (anonymisé — voir la note de
  confidentialité ci-dessous).
- **Proposer une fonctionnalité** : ouvrez une issue « Demande de fonctionnalité »
  décrivant le besoin et le cas d'usage métier.
- **Poser une question** : utilisez l'onglet [Discussions](https://github.com/Yassin-xyz/facture-schematron-validator/discussions)
  s'il est activé, sinon une issue.

> ⚠️ **Confidentialité** : ne joignez jamais de facture réelle contenant des
> données personnelles ou commerciales (SIREN de tiers, montants réels, noms).
> Anonymisez ou repartez des exemples fournis dans `examples/`.

## Mettre en place l'environnement

Prérequis :

- **Node.js 18+** (compilation de l'extension) ;
- **Java 11+** dans le `PATH` (exécution de Saxon-HE) ;
- **VS Code 1.85+**.

```bash
git clone https://github.com/Yassin-xyz/facture-schematron-validator.git
cd facture-schematron-validator
npm install
npm run compile
```

Appuyez sur **F5** dans VS Code pour lancer un *Extension Development Host* avec
l'extension chargée, puis testez la validation sur les fichiers de `examples/`.

## Cycle de développement

- `npm run compile` — compile TypeScript (`src/` → `out/`).
- `npm run watch` — recompile en continu.
- **F5** — lance l'hôte de développement de l'extension.

Testez toujours vos changements sur les trois formats :

- `examples/exemple-ubl.xml` (UBL 2.1),
- `examples/exemple-cii.xml` (CII),
- `examples/exemple-facturx.pdf` (Factur-X / PDF hybride),

ainsi que sur les cas conformes et non conformes de `examples/tests-controles-plus/`.

## Conventions de code

- **TypeScript strict** ; respectez le style du code existant (voir `src/`).
- Une responsabilité par module : détection, extraction, validation, diagnostics
  et UI sont séparées.
- Les **messages destinés à l'utilisateur sont en français** (public cible : la
  réforme française de la facturation électronique).
- Pas de dépendance runtime superflue : l'extension ne dépend que de `pdf-lib`.
- Aucune donnée n'est envoyée sur le réseau : la validation est 100 % locale.
  Toute contribution introduisant un appel réseau doit être explicitement
  justifiée et signalée.

## Contribuer aux règles et traductions

- **Traductions FR** : `validation-artifacts/i18n/fr.json`. Indiquez la règle
  concernée (ex. `BR-CO-17`) et la source de la formulation.
- **Carte BT → balise** : `validation-artifacts/i18n/bt-map.json`.
- **Règles personnalisées** (`controles-plus`, règles FR) : sources dans
  `validation-artifacts/schematron/custom-src/*.sch`. Compilez-les en XSLT avec
  `scripts/compile-schematron.sh` avant de committer l'artefact généré, et
  ajoutez un cas de test dans `examples/tests-controles-plus/`.
- **Artefacts officiels** (EN 16931, Peppol) : ne les modifiez pas à la main ;
  ils sont régénérés par `scripts/download-artifacts.sh`.

## Convention de commits

Messages en français, à l'impératif, précisant le périmètre :

```
Corrige la localisation SVRL quand la balise BT-30 est absente
Ajoute le contrôle PRIX-05 (cohérence remise ligne)
Traduit les règles BR-DEC-* en français
```

## Ouvrir une pull request

1. Forkez le dépôt et créez une branche depuis `main`
   (ex. `feat/controle-prix-05`).
2. Vérifiez que `npm run compile` passe sans erreur.
3. Testez manuellement sur les exemples concernés.
4. Renseignez le modèle de pull request (motivation, périmètre, tests réalisés).
5. Mettez à jour le `CHANGELOG.md` (section « Non publié ») si le changement est
   visible par l'utilisateur.

Une PR ciblée et bien décrite est relue et fusionnée plus rapidement. Merci !
