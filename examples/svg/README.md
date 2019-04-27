## Run Example

> **Note:** make the current working directory in your command line is in the root of the repository.

Generate definition file in place along with original svg files

```bash
resutil -m examples/svg/icons/*.svg
```

If you wish to generate definition file base on file name, apply option -w

```bash
resutil -m -w examples/svg/icons/*.svg
```

To Generate definition file in a specific location

```bash
resutil -m -o examples/svg/icons/out examples/svg/icons/*.svg
```

Using alias

Suppose that your alias configuration in `tsconfig.json` is look like this:

```json
{
  "compilerOptions": {
     "paths": {
       "@examples/*": [
         "examples/*"
       ]
     }
  }
}
```
To Generate definition file your're required to given more information about alias

```bash
reutil -m -o examples/svg/icons/out --mod @examples --path examples examples/svg/icons/*.svg
```

Now, you can import the module as 
```typescript
import * as cssModule from "@examples/svg/icons"
```