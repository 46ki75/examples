resource "github_repository" "examples" {
  name = "examples"

  has_downloads        = false
  has_issues           = true
  has_projects         = false
  has_wiki             = false
  vulnerability_alerts = true
}
