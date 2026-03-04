Set-Location 'C:\Users\RobertoCarlosZuñigaA\Documents\ROCCA ARCHIVOS\Desarrollo\PROYECTOS DESAROLLOS\KPITAL 360\NewKipital\api'

$files = @(
  'src\workflows\employees\employee-creation.workflow.ts',
  'src\workflows\identity\identity-sync.workflow.ts',
  'src\modules\employees\employees.service.ts',
  'src\modules\payroll\payroll.service.ts',
  'src\modules\payroll\intercompany-transfer.service.ts',
  'src\modules\personal-actions\personal-actions.service.ts',
  'src\modules\personal-actions\personal-action-auto-invalidation.service.ts',
  'src\modules\companies\companies.service.ts',
  'src\modules\employees\services\employee-vacation.service.ts'
)

foreach ($f in $files) {
  $content = Get-Content $f -Raw -Encoding UTF8
  # EventEmitter2
  $content = $content -replace "import type \{ (EventEmitter2[^}]*) \} from '@nestjs/event-emitter';", "import { `$1 } from '@nestjs/event-emitter';"
  # DataSource, EntityManager, Repository de typeorm
  $content = $content -replace "import type \{ ((?:DataSource|EntityManager|Repository)[^}]*) \} from 'typeorm';", "import { `$1 } from 'typeorm';"
  [System.IO.File]::WriteAllText((Resolve-Path $f).Path, $content, [System.Text.Encoding]::UTF8)
  Write-Host "Fixed: $f"
}

Write-Host "DONE - All files fixed"
