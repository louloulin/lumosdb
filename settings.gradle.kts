rootProject.name = "lumos-db"

// 包含clients目录下的子项目
include(":kotlin")
project(":kotlin").projectDir = file("clients/kotlin")

include(":validation")
project(":validation").projectDir = file("clients/validation")
