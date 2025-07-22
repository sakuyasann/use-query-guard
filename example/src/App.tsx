import { CodeHighlight } from '@mantine/code-highlight'
import { Button, Code, Container, Stack, Table } from '@mantine/core'
import z from 'zod'
import { useSearchParams } from './libs'

// サンプルスキーマ
const schema = z.object({
  name: z.string(),
  age: z.coerce.number(),
  isActive: z.coerce.boolean(),
})

// type FieldData = {
//   key: string
//   value: string
//   active: boolean
//   id: string
// }

function App() {
  const { data, isReady, updateParams, isError } = useSearchParams({
    resolver: schema,
  })

  console.log('data: ', data)
  console.log('isError: ', isError)

  // const [searchParams] = useBaseSearchParams()

  // const form = useForm<{
  //   data: FieldData[]
  // }>({
  //   initialValues: {
  //     data: [],
  //   },
  // })

  // const fieldData = form.getValues().data

  // useEffect(() => {
  //   if (isReady) {
  //     const p = {} as Record<string, string>
  //     searchParams.forEach((v, k) => {
  //       p[k] = v
  //     })

  //     const data = Object.entries(p).map(([key, value]) => ({
  //       key,
  //       value,
  //       active: true,
  //       id: randomId(),
  //     }))

  //     form.setValues({
  //       data,
  //     })
  //   }
  // }, [isReady])

  // useEffect(() => {
  //   if (fieldData.length === 0) {
  //     form.insertListItem('data', {
  //       key: '',
  //       value: '',
  //       active: true,
  //       id: randomId(),
  //     })
  //   }

  //   // 全てのデータがkey または value が入っていたら新しく行を追加する
  //   if (fieldData.every(({ key, value }) => key !== '' || value !== '')) {
  //     form.insertListItem('data', {
  //       key: '',
  //       value: '',
  //       active: true,
  //       id: randomId(),
  //     })
  //   }
  // }, [fieldData])

  return (
    <Container p="xl">
      <Stack gap="xl">
        <Button
          onClick={() =>
            updateParams({
              name: undefined,
              isActive: true,
            })
          }
        >
          updateParams
        </Button>
        <Table
          withTableBorder
          withColumnBorders
          withRowBorders
          variant="vertical"
        >
          <Table.Tbody>
            <Table.Tr>
              <Table.Th>isReady</Table.Th>
              <Table.Td>
                <Code>{isReady ? 'true' : 'false'}</Code>
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Th>data</Table.Th>
              <Table.Td>
                <CodeHighlight
                  code={JSON.stringify(data, null, 2)}
                  language="json"
                />
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Th>isError</Table.Th>
              <Table.Td>
                <Code>{isError ? 'true' : 'false'}</Code>
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>

        {/*  */}
        {/* <Group wrap="nowrap">
          <Input
            size="lg"
            w="100%"
            value={objectToSearchParams(fieldData)}
            readOnly
          />
          <Button
            size="lg"
            onClick={() => {
              const data = fieldData.reduce(
                (acc, { key, value, active }) => {
                  if (key !== '' && active) {
                    acc[key] = value ?? ''
                  }
                  return acc
                },
                {} as Record<string, string>
              )
              updateParams(data)
            }}
          >
            Send
          </Button>
        </Group> */}

        {/* <Table withTableBorder withColumnBorders withRowBorders layout="fixed">
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={42}></Table.Th>
              <Table.Th>key</Table.Th>
              <Table.Th>value</Table.Th>
              <Table.Th w={48}></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {form.getValues().data.map(({ id }, index) => (
              <Table.Tr key={id}>
                <Table.Td>
                  <Checkbox
                    {...form.getInputProps(`data.${index}.active`, {
                      type: 'checkbox',
                    })}
                  />
                </Table.Td>
                <Table.Td p={0}>
                  <Input
                    size="md"
                    styles={{
                      input: {
                        borderColor: 'transparent',
                      },
                    }}
                    placeholder="key"
                    {...form.getInputProps(`data.${index}.key`)}
                  />
                </Table.Td>
                <Table.Td p={0}>
                  <Input
                    size="md"
                    styles={{
                      input: {
                        borderColor: 'transparent',
                      },
                    }}
                    placeholder="value"
                    {...form.getInputProps(`data.${index}.value`)}
                  />
                </Table.Td>
                <Table.Td>
                  <CloseButton
                    onClick={() => form.removeListItem('data', index)}
                  />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table> */}
      </Stack>
    </Container>
  )
}

export default App

// const objectToSearchParams = (obj: FieldData[]) => {
//   const data = obj.reduce(
//     (acc, { key, value, active }) => {
//       if (key !== '' && active) {
//         acc[key] = value ?? ''
//       }
//       return acc
//     },
//     {} as Record<string, string>
//   )

//   return Object.entries(data)
//     .map(([key, value], index) => `${index === 0 ? '' : '&'}${key}=${value}`)
//     .join('')
// }
