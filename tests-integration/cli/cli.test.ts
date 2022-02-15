const path = require("path")
const util = require("util")
const fs = require('fs');
const readFile = fs.readFileSync
const mkdir = fs.mkdirSync
const rmdir = util.promisify(fs.rm)
const cli = require("../../cli/cli")
const writeFile = util.promisify(fs.writeFile)

/**
 * create folder structure
 * create morphir.json
 * create elm file
 */

// utility function for joining strings with newlines
const join = (...rest: String[]): String => rest.join("\n")

describe("Testing Morphir-elm make command", () => {
    const PATH_TO_PROJECT: String = path.join(__dirname, 'temp/project')
    const CLI_OPTIONS = { typesOnly: false }
    const morphirJSON = {
        name: "Package",
        sourceDirectory: "src",
        exposedModules: ["Rentals"]
    }

    beforeAll(async () => {
        // create the folders to house test data
        await mkdir(path.join(PATH_TO_PROJECT, '/src/Package'), { recursive: true })
    })

    beforeEach(async () => {
        await writeFile(path.join(PATH_TO_PROJECT, 'morphir.json'), JSON.stringify(morphirJSON))
    })

    test("should create an IR with no modules when no elm files are found", async () => {
        const IR = await cli.make(PATH_TO_PROJECT, CLI_OPTIONS)
        expect(IR.distribution[3].modules).toMatchObject([])
    })

    test("should create an IR with no types when no types are found in elm file", async () => {
        await writeFile(path.join(PATH_TO_PROJECT, 'src/Package', 'Rentals.elm'), join(
            "module Package.Rentals exposing (logic)",
            "",
            "logic: String -> String",
            "logic level =",
            `   String.append "Player level: " level`
        ))

        const IR = await cli.make(PATH_TO_PROJECT, CLI_OPTIONS)
        const rentalsModule = IR.distribution[3].modules[0]
        expect(rentalsModule[1].value.types).toMatchObject([])
    })

    test("should create an IR with no values when no values are found in elm file", async () => {
        await writeFile(path.join(PATH_TO_PROJECT, 'src/Package', 'Rentals.elm'), join(
            "module Package.Rentals exposing (Action)",
            "",
            "type Action",
            `   = Rent`,
            `   | Return`
        ))

        const IR = await cli.make(PATH_TO_PROJECT, CLI_OPTIONS)
        const rentalsModule = IR.distribution[3].modules[0]
        expect(rentalsModule[1].value.values).toMatchObject([])
    })

    test("should create an IR with both types and values", async () => {
        await writeFile(path.join(PATH_TO_PROJECT, 'src/Package', 'Rentals.elm'), join(
            "module Package.Rentals exposing (..)",
            "",
            "type Action",
            `   = Rent`,
            `   | Return`,
            "",
            "logic: String -> String",
            "logic level =",
            `   String.append "Player level: " level`
        ))
        const IR = await cli.make(PATH_TO_PROJECT, CLI_OPTIONS)
        const rentalsModule = IR.distribution[3].modules[0]
        expect(rentalsModule[1].value.values).not.toMatchObject([])
        expect(rentalsModule[1].value.types).not.toMatchObject([])
    })

    test("should create an IR with only types when typesOnly is set to true", async () => {
        await writeFile(path.join(PATH_TO_PROJECT, 'src/Package', 'Rentals.elm'), join(
            "module Package.Rentals exposing (..)",
            "",
            "type Action",
            `   = Rent`,
            `   | Return`,
            "",
            "logic: String -> String",
            "logic level =",
            `   String.append "Player level: " level`
        ))
        const IR = await cli.make(PATH_TO_PROJECT, { typesOnly: true })
        const rentalsModule = IR.distribution[3].modules[0]
        expect(rentalsModule[1].value.values).toMatchObject([])
        expect(rentalsModule[1].value.types).not.toMatchObject([])
    })

    test("should contain two modules", async () => {
        await writeFile(path.join(PATH_TO_PROJECT, 'morphir.json'), JSON.stringify({ ...morphirJSON, exposedModules: ["Rentals", "RentalTypes"] }))
        await writeFile(path.join(PATH_TO_PROJECT, 'src/Package', 'Rentals.elm'), join(
            "module Package.Rentals exposing (..)",
            "",
            "logic: String -> String",
            "logic level =",
            `   String.append "Player level: " level`
        ))
        await writeFile(path.join(PATH_TO_PROJECT, 'src/Package', 'RentalTypes.elm'), join(
            "module Package.RentalTypes exposing (..)",
            "",
            "type Action",
            `   = Rent`,
            `   | Return`,
        ))
        const IR = await cli.make(PATH_TO_PROJECT, { typesOnly: true })
        const modules = IR.distribution[3].modules
        expect(modules).toHaveLength(2)
    })

    afterAll(async () => {
        await rmdir(path.join(__dirname, 'temp'), { recursive: true })
    })
})