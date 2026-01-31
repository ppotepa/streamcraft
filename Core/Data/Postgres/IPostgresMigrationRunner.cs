namespace Core.Data.Postgres;

public interface IPostgresMigrationRunner
{
    void ApplyMigrations(IReadOnlyList<MigrationSource> sources);
}
