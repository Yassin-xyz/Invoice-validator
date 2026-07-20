# Politique de sécurité

## Versions prises en charge

Seule la dernière version publiée de l'extension reçoit des correctifs de
sécurité. Mettez-vous à jour avant tout signalement.

| Version | Prise en charge |
|---|---|
| 0.16.x | ✅ |
| < 0.16 | ❌ |

## Signaler une vulnérabilité

Si vous découvrez une faille de sécurité, **ne l'ouvrez pas dans une issue
publique**.

Contactez-nous en privé :

- de préférence via l'onglet **Security → Report a vulnerability** du dépôt
  GitHub (avis de sécurité privé) ;
- ou par e-mail à **yassin.yaou@outlook.fr**.

Merci d'inclure :

- une description de la vulnérabilité et de son impact potentiel ;
- les étapes de reproduction (avec un exemple **anonymisé** — jamais de facture
  réelle contenant des données personnelles) ;
- la version de l'extension, de VS Code et de Java concernées.

Nous nous efforçons d'accuser réception sous **72 heures** et de communiquer un
plan de correction sous **30 jours**. Nous vous tiendrons informé·e de l'avancée
et vous créditerons dans l'avis publié, sauf demande contraire.

## Périmètre et modèle de menace

Cette extension effectue **toute la validation en local** : elle ne transmet
aucune donnée de facture sur le réseau. Les surfaces d'attaque pertinentes sont
notamment :

- le **traitement de fichiers non fiables** (XML, PDF Factur-X) — entités XML
  externes, PDF malformés, contournement de l'extraction du XML embarqué ;
- l'**exécution de Saxon-HE via Java** — arguments ou chemins non maîtrisés ;
- les **XSLT/Schematron personnalisés** fournis par l'utilisateur via
  `factureValidator.customSchematronXslt` (exécution de code XSLT arbitraire :
  n'utilisez que des artefacts de confiance).

Sont **hors périmètre** : la sécurité de VS Code lui-même, celle de l'installation
Java de l'utilisateur, et les artefacts de validation tiers (EN 16931, Peppol,
FNFE) qui relèvent de leurs éditeurs respectifs.
