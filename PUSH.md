# Publier sur GitHub

Le dépôt distant est déjà configuré :

```
https://github.com/Yassin-xyz/facture-schematron-validator.git
```

Si vous repartez d'un clone vierge, ou pour (re)pointer le remote :

```bash
git remote add origin https://github.com/Yassin-xyz/facture-schematron-validator.git
# ou, si origin existe déjà :
git remote set-url origin https://github.com/Yassin-xyz/facture-schematron-validator.git

git branch -M main
git push -u origin main
```

> ℹ️ Le dépôt doit exister sur github.com avant le premier `push`. Créez-le vide
> (sans README) puis lancez la commande ci-dessus.
