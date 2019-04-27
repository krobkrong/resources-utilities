## Run Example

> **Note:** make the current working directory in your command line is in the root of the repository.

Generate definition file in place along with original css file

```bash
resutil examples/css/main.css 
```

To Generate definition file in a specific location

```bash
reutil -o examples/css/out examples/css/main.css 
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
reutil -o examples/css/out --mod @examples --path examples examples/css/main.css
```

Now, you can import the module as 
```typescript
import * as cssModule from "@examples/css/main.css"
```