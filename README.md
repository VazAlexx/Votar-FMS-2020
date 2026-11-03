# FMS 2020 · Panel de votación

## Instalación
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
```

La base de datos se crea desde cero. Registrá los MC desde **Competidores** y luego creá una batalla.
