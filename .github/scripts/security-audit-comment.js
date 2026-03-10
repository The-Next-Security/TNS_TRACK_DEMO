// Script para generar comentarios detallados en PRs sobre Security Audit
// Ejecutado por github-script en el workflow security-audit.yml

module.exports = async ({github, context}) => {
  const fs = require('fs');

  // Leer el reporte completo de auditoría
  let auditData = {};
  try {
    const auditReport = fs.readFileSync('./servicios/audit-report.json', 'utf8');
    auditData = JSON.parse(auditReport);
  } catch (error) {
    console.log('No se pudo leer audit-report.json:', error.message);
  }

  // Extraer información de vulnerabilidades
  const metadata = auditData.metadata || {};
  const vulnerabilities = auditData.vulnerabilities || {};
  const vulnCounts = metadata.vulnerabilities || {critical: 0, high: 0, moderate: 0, low: 0, info: 0};

  // Determinar estado del audit desde GITHUB_OUTPUT
  const critical = parseInt(process.env.CRITICAL) || 0;
  const high = parseInt(process.env.HIGH) || 0;
  const moderate = parseInt(process.env.MODERATE) || 0;
  const low = parseInt(process.env.LOW) || 0;
  const info = parseInt(process.env.INFO) || 0;

  const hasCriticalIssues = (critical + high) > 0;
  const totalVulns = critical + high + moderate + low + info;

  // Construir tabla de resumen (usando HTML para evitar problemas con pipes en YAML)
  const summaryTable = `
<table>
<tr><th>Severidad</th><th>Cantidad</th><th>Bloquea Build</th></tr>
<tr><td>🔴 Critical</td><td>${critical}</td><td>✅ Sí</td></tr>
<tr><td>🟠 High</td><td>${high}</td><td>✅ Sí</td></tr>
<tr><td>🟡 Moderate</td><td>${moderate}</td><td>❌ No</td></tr>
<tr><td>🔵 Low</td><td>${low}</td><td>❌ No</td></tr>
<tr><td>ℹ️ Info</td><td>${info}</td><td>❌ No</td></tr>
<tr><td><strong>TOTAL</strong></td><td><strong>${totalVulns}</strong></td><td></td></tr>
</table>
  `;

  // Construir lista COMPLETA de paquetes vulnerables con detalles
  let packageDetails = '';
  const vulnEntries = Object.entries(vulnerabilities);

  if (vulnEntries.length > 0) {
    packageDetails = '\n## 📦 Detalle Completo de Vulnerabilidades\n\n';
    packageDetails += `> Se encontraron **${vulnEntries.length} paquetes** con vulnerabilidades.\n\n`;

    // Ordenar por severidad: critical > high > moderate > low > info
    const severityOrder = { critical: 0, high: 1, moderate: 2, low: 3, info: 4, unknown: 5 };
    vulnEntries.sort((a, b) => {
      const sevA = severityOrder[a[1].severity] ?? 5;
      const sevB = severityOrder[b[1].severity] ?? 5;
      return sevA - sevB;
    });

    for (const [pkgName, vulnInfo] of vulnEntries) {
      const severity = vulnInfo.severity || 'unknown';
      const isDirect = vulnInfo.isDirect ? '✅ Directa' : '⚠️ Transitiva';
      const fixAvailable = vulnInfo.fixAvailable ? '✅ Disponible' : '❌ No disponible';

      let emoji = '🔵';
      if (severity === 'critical') emoji = '🔴';
      else if (severity === 'high') emoji = '🟠';
      else if (severity === 'moderate') emoji = '🟡';
      else if (severity === 'info') emoji = 'ℹ️';

      packageDetails += `### ${emoji} \`${pkgName}\`\n\n`;
      packageDetails += `- **Severidad:** ${severity.toUpperCase()}\n`;
      packageDetails += `- **Tipo de dependencia:** ${isDirect}\n`;
      packageDetails += `- **Fix disponible:** ${fixAvailable}\n`;

      // Extraer información del advisory
      if (vulnInfo.via && Array.isArray(vulnInfo.via)) {
        for (const advisory of vulnInfo.via) {
          if (typeof advisory === 'object') {
            if (advisory.title) {
              packageDetails += `- **Título:** ${advisory.title}\n`;
            }
            if (advisory.source && advisory.url) {
              packageDetails += `- **Advisory:** [${advisory.source}](${advisory.url})\n`;
            }
            if (advisory.cvss) {
              packageDetails += `- **CVSS Score:** ${advisory.cvss.score} (\`${advisory.cvss.vectorString}\`)\n`;
            }
            if (advisory.cwe && Array.isArray(advisory.cwe)) {
              packageDetails += `- **CWE:** ${advisory.cwe.join(', ')}\n`;
            }
            if (advisory.range) {
              packageDetails += `- **Versiones afectadas:** \`${advisory.range}\`\n`;
            }
          } else if (typeof advisory === 'string') {
            packageDetails += `- **Depende de:** \`${advisory}\`\n`;
          }
        }
      }

      // Agregar recomendación específica
      if (vulnInfo.fixAvailable === true) {
        packageDetails += `\n**✅ Acción recomendada:**\n\`\`\`bash\nnpm update ${pkgName}\n\`\`\`\n`;
      } else if (vulnInfo.fixAvailable && typeof vulnInfo.fixAvailable === 'object') {
        const fixPkg = vulnInfo.fixAvailable.name || pkgName;
        const fixVer = vulnInfo.fixAvailable.version || 'latest';
        packageDetails += `\n**⚠️ Acción recomendada:**\n\`\`\`bash\nnpm install ${fixPkg}@${fixVer}\n\`\`\`\n`;
      } else {
        packageDetails += `\n**⚠️ No hay fix automático disponible. Opciones:**\n`;
        packageDetails += `1. Verificar manualmente si existe versión más reciente del paquete\n`;
        packageDetails += `2. Buscar paquete alternativo que cumpla la misma función\n`;
        packageDetails += `3. Evaluar si el vector de ataque aplica a esta aplicación\n`;
        packageDetails += `4. Si se acepta el riesgo temporalmente, documentar en \`decisions.md\`\n`;
      }

      packageDetails += '\n---\n\n';
    }
  }

  // Construir sección de análisis y recomendaciones
  let analysisSection = '\n## 🔍 Análisis y Recomendaciones\n\n';

  if (hasCriticalIssues) {
    analysisSection += `### ⛔ Acción Requerida (Bloquea Merge)\n\n`;
    analysisSection += `Este PR **no puede mergearse** hasta resolver las **${critical + high} vulnerabilidades críticas/altas**.\n\n`;
    analysisSection += `**Pasos sugeridos:**\n\n`;
    analysisSection += `1. Ejecutar localmente:\n   \`\`\`bash\n   cd servicios\n   npm audit\n   \`\`\`\n\n`;
    analysisSection += `2. Revisar cada vulnerabilidad listada arriba\n`;
    analysisSection += `3. Aplicar fixes disponibles:\n   \`\`\`bash\n   npm audit fix\n   \`\`\`\n\n`;
    analysisSection += `4. Si no hay fix automático:\n`;
    analysisSection += `   - Actualizar manualmente: \`npm install <paquete>@latest\`\n`;
    analysisSection += `   - Buscar alternativas al paquete vulnerable\n`;
    analysisSection += `   - Consultar con el equipo de seguridad\n\n`;
    analysisSection += `5. Re-ejecutar este workflow y validar que pasa\n\n`;
  } else if (moderate > 0 || low > 0) {
    analysisSection += `### ℹ️ Contexto para Decisión (No Bloquea Merge)\n\n`;
    analysisSection += `Las vulnerabilidades **moderate/low no bloquean el merge**, pero es recomendable:\n\n`;
    analysisSection += `1. **Revisar cada paquete afectado** (detalles arriba) y su impacto potencial\n`;
    analysisSection += `2. **Evaluar el riesgo** en el contexto específico de esta aplicación:\n`;
    analysisSection += `   - ¿El vector de ataque aplica a nuestro caso de uso?\n`;
    analysisSection += `   - ¿Hay mitigaciones existentes en el código?\n`;
    analysisSection += `   - ¿Cuál es la superficie de exposición?\n\n`;
    analysisSection += `3. **Planificar resolución:**\n`;
    analysisSection += `   - Sprint actual si es factible y no introduce breaking changes\n`;
    analysisSection += `   - Sprint futuro si requiere refactorización importante\n`;
    analysisSection += `   - Crear issue dedicado para dar seguimiento\n\n`;
    analysisSection += `4. **Documentar decisión** en \`decisions.md\` si se acepta el riesgo temporalmente\n\n`;
    analysisSection += `**Comandos útiles:**\n\n`;
    analysisSection += `\`\`\`bash\n`;
    analysisSection += `cd servicios\n`;
    analysisSection += `npm audit                          # Ver reporte completo\n`;
    analysisSection += `npm audit --audit-level=moderate  # Solo moderate y superior\n`;
    analysisSection += `npm audit fix                      # Aplicar fixes automáticos (con precaución)\n`;
    analysisSection += `npm audit fix --force              # Forzar fixes (puede romper compatibilidad)\n`;
    analysisSection += `npm update <paquete>               # Actualizar paquete específico\n`;
    analysisSection += `npm outdated                       # Ver paquetes desactualizados\n`;
    analysisSection += `\`\`\`\n\n`;
  } else {
    analysisSection += `### ✅ Estado Excelente\n\n`;
    analysisSection += `No se encontraron vulnerabilidades de seguridad. ¡Excelente trabajo manteniendo las dependencias actualizadas!\n\n`;
    analysisSection += `**Recomendaciones de mantenimiento:**\n`;
    analysisSection += `- Ejecutar \`npm audit\` periódicamente (este workflow lo hace diariamente)\n`;
    analysisSection += `- Revisar y actualizar dependencias cada sprint\n`;
    analysisSection += `- Monitorear advisories de seguridad de paquetes críticos\n\n`;
  }

  // Construir TL;DR
  let tldr = '\n---\n\n## 📝 TL;DR (Resumen Ejecutivo)\n\n';

  if (hasCriticalIssues) {
    tldr += `🔴 **CRÍTICO - NO MERGEAR**\n\n`;
    tldr += `- **${critical + high} vulnerabilidades críticas/altas** detectadas\n`;
    tldr += `- **Acción:** Resolver TODAS antes de merge\n`;
    tldr += `- **Prioridad:** 🔥 URGENTE\n`;
    if (moderate > 0 || low > 0) {
      tldr += `- **Adicional:** ${moderate + low} vulnerabilidades menores también detectadas\n`;
    }
  } else if (moderate > 0) {
    tldr += `🟡 **ADVERTENCIA - PUEDE MERGEAR CON PRECAUCIÓN**\n\n`;
    tldr += `- **${moderate} vulnerabilidades moderate** detectadas\n`;
    tldr += `- **No bloquean el merge**, pero requieren atención\n`;
    tldr += `- **Acción sugerida:** Revisar detalles, evaluar riesgo, planificar resolución\n`;
    tldr += `- **Prioridad:** ⚠️ MEDIA - Resolver en próximo sprint\n`;
    if (low > 0) {
      tldr += `- **Adicional:** ${low} vulnerabilidades low también detectadas\n`;
    }
  } else if (low > 0) {
    tldr += `🔵 **INFO - OK PARA MERGEAR**\n\n`;
    tldr += `- **${low} vulnerabilidades low** detectadas (severidad baja)\n`;
    tldr += `- **Acción:** Revisar cuando haya tiempo disponible\n`;
    tldr += `- **Prioridad:** 📋 BAJA - Backlog\n`;
  } else {
    tldr += `✅ **TODO PERFECTO - OK PARA MERGEAR**\n\n`;
    tldr += `- **0 vulnerabilidades** detectadas\n`;
    tldr += `- **Acción:** Ninguna, continuar con merge\n`;
    tldr += `- **Estado:** 🎉 EXCELENTE\n`;
  }

  tldr += `\n**Detalle completo:** Ver secciones arriba ⬆️\n`;

  // Construir encabezado según estado
  let icon, title, summary;
  if (hasCriticalIssues) {
    icon = '🔴';
    title = 'Auditoría de Seguridad FALLÓ';
    summary = `Se detectaron **${critical + high} vulnerabilidades CRÍTICAS o ALTAS** que bloquean este PR.`;
  } else if (moderate > 0 || low > 0) {
    icon = '🟡';
    title = 'Auditoría de Seguridad PASÓ con Advertencias';
    summary = `No hay vulnerabilidades críticas. Se encontraron **${moderate} moderate** y **${low} low** que requieren revisión.`;
  } else {
    icon = '✅';
    title = 'Auditoría de Seguridad PASÓ Exitosamente';
    summary = '¡Excelente! No se encontraron vulnerabilidades de seguridad.';
  }

  // Mensaje final completo
  const commentBody = `
${icon} **${title}**

${summary}

## 📊 Resumen de Vulnerabilidades

${summaryTable}

**Total de dependencias analizadas:** ${metadata.dependencies?.total || 'N/A'}
- 📦 Producción: ${metadata.dependencies?.prod || 'N/A'}
- 🛠️ Desarrollo: ${metadata.dependencies?.dev || 'N/A'}

${packageDetails}

${analysisSection}

## 📁 Recursos Adicionales

- **Reporte JSON completo:** Disponible en [Actions Artifacts](${context.payload.repository.html_url}/actions/runs/${context.runId})
- **Retención de artefactos:** 30 días
- **Documentación npm audit:** https://docs.npmjs.com/cli/v10/commands/npm-audit
- **CVE Database:** https://cve.mitre.org/

${tldr}

---

<sub>**Workflow:** ${context.workflow} | **Run:** [#${context.runNumber}](${context.payload.repository.html_url}/actions/runs/${context.runId}) | **Fecha:** ${new Date().toISOString()}</sub>
  `;

  // Publicar comentario
  await github.rest.issues.createComment({
    issue_number: context.issue.number,
    owner: context.repo.owner,
    repo: context.repo.repo,
    body: commentBody
  });
};
