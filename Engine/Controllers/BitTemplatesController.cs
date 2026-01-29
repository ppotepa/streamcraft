using Microsoft.AspNetCore.Mvc;
using Core.Bits.Templates;
using HttpGetAttribute = Engine.Attributes.HttpGetAttribute;
using HttpPostAttribute = Engine.Attributes.HttpPostAttribute;
using RouteAttribute = Engine.Attributes.RouteAttribute;

namespace Engine.Controllers;

/// <summary>
/// API for managing bit templates and dynamic bit creation
/// </summary>
public class BitTemplatesController : BaseController
{
    private readonly BitTemplateRegistry _templateRegistry;
    private readonly BitDefinitionStore _definitionStore;
    private readonly Serilog.ILogger _logger;

    public BitTemplatesController(
        BitTemplateRegistry templateRegistry,
        BitDefinitionStore definitionStore,
        Serilog.ILogger logger)
    {
        _templateRegistry = templateRegistry;
        _definitionStore = definitionStore;
        _logger = logger;
    }

    [Route("/api/templates")]
    [HttpGet]
    public IActionResult GetTemplates()
    {
        var templates = _templateRegistry.GetAllTemplates()
            .Select(t => new
            {
                id = t.TemplateId,
                name = t.TemplateName,
                description = t.TemplateDescription,
                category = t.Category,
                icon = t.Icon,
                configSchema = t.GetConfigurationSchema()
            })
            .ToList();

        return Ok(new
        {
            templates = templates,
            categories = _templateRegistry.GetCategories()
        });
    }

    [Route("/api/templates/{templateId}")]
    [HttpGet]
    public IActionResult GetTemplate(string templateId)
    {
        var template = _templateRegistry.GetTemplate(templateId);
        if (template == null)
        {
            return NotFound(new { error = $"Template '{templateId}' not found" });
        }

        return Ok(new
        {
            id = template.TemplateId,
            name = template.TemplateName,
            description = template.TemplateDescription,
            category = template.Category,
            icon = template.Icon,
            configSchema = template.GetConfigurationSchema()
        });
    }

    [Route("/api/bits/dynamic")]
    [HttpGet]
    public async Task<IActionResult> GetDynamicBits()
    {
        var definitions = await _definitionStore.LoadAllAsync();
        return Ok(new { bits = definitions });
    }

    [Route("/api/bits/dynamic")]
    [HttpPost]
    public async Task<IActionResult> CreateDynamicBit([FromBody] BitDefinition definition)
    {
        try
        {
            var template = _templateRegistry.GetTemplate(definition.TemplateId);
            if (template == null)
            {
                return BadRequest(new { error = $"Template '{definition.TemplateId}' not found" });
            }

            var validation = template.Validate(definition);
            if (!validation.IsValid)
            {
                return BadRequest(new { error = "Validation failed", errors = validation.Errors });
            }

            await _definitionStore.SaveAsync(definition);
            _logger.Information("Created dynamic bit: {BitName} ({BitId})", definition.Name, definition.Id);

            return Created($"/api/bits/dynamic/{definition.Id}", new
            {
                message = "Bit created successfully. Restart the application to load the new bit.",
                bit = definition
            });
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Failed to create dynamic bit");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [Route("/api/bits/dynamic/{id}")]
    [HttpGet]
    public async Task<IActionResult> GetDynamicBit(string id)
    {
        var definition = await _definitionStore.GetByIdAsync(id);
        if (definition == null)
        {
            return NotFound(new { error = "Bit not found" });
        }

        return Ok(definition);
    }

    [Route("/api/bits/dynamic/{id}")]
    [HttpPost]
    public async Task<IActionResult> UpdateDynamicBit(string id, [FromBody] BitDefinition definition)
    {
        if (id != definition.Id)
        {
            return BadRequest(new { error = "ID mismatch" });
        }

        var existing = await _definitionStore.GetByIdAsync(id);
        if (existing == null)
        {
            return NotFound(new { error = "Bit not found" });
        }

        var template = _templateRegistry.GetTemplate(definition.TemplateId);
        if (template == null)
        {
            return BadRequest(new { error = $"Template '{definition.TemplateId}' not found" });
        }

        var validation = template.Validate(definition);
        if (!validation.IsValid)
        {
            return BadRequest(new { error = "Validation failed", errors = validation.Errors });
        }

        await _definitionStore.SaveAsync(definition);
        _logger.Information("Updated dynamic bit: {BitName} ({BitId})", definition.Name, definition.Id);

        return Ok(new
        {
            message = "Bit updated successfully. Restart the application to apply changes.",
            bit = definition
        });
    }

    [Route("/api/bits/dynamic/{id}")]
    [HttpPost] // Using POST with action=delete since we don't have DELETE attribute
    public async Task<IActionResult> DeleteDynamicBit(string id)
    {
        var existing = await _definitionStore.GetByIdAsync(id);
        if (existing == null)
        {
            return NotFound(new { error = "Bit not found" });
        }

        await _definitionStore.DeleteAsync(id);
        _logger.Information("Deleted dynamic bit: {BitId}", id);

        return Ok(new { message = "Bit deleted successfully. Restart the application to remove the bit." });
    }
}
