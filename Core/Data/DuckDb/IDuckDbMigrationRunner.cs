namespace Core.Data.DuckDb;

public interface IDuckDbMigrationRunner
{
    Task ApplyMigrationsAsync(MigrationSource source, CancellationToken cancellationToken = default);
}
