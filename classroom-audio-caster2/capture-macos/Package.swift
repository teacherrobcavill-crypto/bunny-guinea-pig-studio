// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "capture-macos",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .executable(
            name: "capture-macos",
            targets: ["capture-macos"]
        ),
    ],
    targets: [
        .executableTarget(
            name: "capture-macos",
            dependencies: [],
            path: "Sources",
            linkerSettings: [
                .linkedFramework("CoreAudio"),
                .linkedFramework("AudioToolbox")
            ]
        ),
    ]
)
