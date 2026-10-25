# Public-proxy training

Тренер предназначен для публичного challenger-контра, а не для production-решений.

Источник: [LendingClub loan dataset for granting models](https://zenodo.org/records/11295916).
Набор содержит только признаки, доступные на момент заявки, и бинарный итог `Default`.

Скачайте CSV с официальной страницы Zenodo и запустите:

```bash
PYTHONPATH=apps/scoring python3 -m training.train_public_proxy \
  /path/to/LC_loans_granting_model_dataset.csv \
  --output apps/scoring/artifacts/public-proxy-logistic.json
```

Артефакт всегда содержит `dataset_scope=public_proxy:lendingclub_granting_model` и
`production_eligible=false`. Он предназначен для shadow/evaluation и не может автоматически
стать champion. Перед любым production promotion нужны российские/банковские данные,
backtest, calibration и policy approval.
