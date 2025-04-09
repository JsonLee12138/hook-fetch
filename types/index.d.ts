import { ImportsMap } from 'unplugin-auto-import/types';
export interface AutoImportOptions {
    path?: string;
    pkgName: string;
    alias?: (name: string) => string;
    excludes?: (string | RegExp)[];
}
/**
 * Automatically imports specified modules and generates an import map.
 * 自动导入指定模块并生成导入映射。

 * @param {string} path - The path to the source file. If not provided, `pkgName` will be used.
 * @param {string} path - 源文件的路径。如果未提供，将使用 `pkgName`。

 * @param {string} pkgName - The name of the package to import from.
 * @param {string} pkgName - 要导入的包的名称。

 * @param {(name: string) => string} [alias] - A function to generate aliases for imported names.
 * @param {(name: string) => string} [alias] - 用于为导入名称生成别名的函数。

 * @param {string[]} [excludes] - A list of names to exclude from the import.
 * @param {string[]} [excludes] - 要从导入中排除的名称列表。
 */
export declare const autoImport: ({ path, pkgName, alias, excludes }: AutoImportOptions) => ImportsMap;
