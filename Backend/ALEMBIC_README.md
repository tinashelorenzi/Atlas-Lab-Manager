# Alembic Migrations

This project uses Alembic for database migrations.

## Running Migrations

### Apply all pending migrations:
```bash
cd Backend
source venv/bin/activate
alembic upgrade head
```

### Create a new migration:
```bash
alembic revision --autogenerate -m "Description of changes"
```

### Rollback one migration:
```bash
alembic downgrade -1
```

### Rollback to a specific revision:
```bash
alembic downgrade <revision_id>
```

### View current migration status:
```bash
alembic current
```

### View migration history:
```bash
alembic history
```

## Initial Setup

After setting up your `.env` file with database credentials, run:

```bash
alembic upgrade head
```

This will create all the necessary tables in your database.

