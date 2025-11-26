/* eslint-disable no-console */
import { zodResolver } from "@hookform/resolvers/zod"
import { Alert, Button, Heading, Hint, Input, Select, Text } from "@medusajs/ui"
import { useForm } from "react-hook-form"
import { Trans, useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import * as z from "zod"
import { useState } from "react"

import { Form } from "../../components/common/form"
import AvatarBox from "../../components/common/logo-box/avatar-box"
// CHANGED: import the new hooks directly from auth
import {
  RegisterPayload,
  useSignUpWithEmailPassBare,
  useCreateSellerExtended,
} from "../../hooks/api/auth"
import { isFetchError } from "../../lib/is-fetch-error"
import { uploadImage } from "../../lib/uploads"

const RegisterSchema = z
  .object({
    name: z.string().min(2, { message: "El nombre de la tienda es requerido." }),
    member_name: z.string().min(3, { message: "El nombre del propietario es requerido." }),
    email: z.string().email({ message: "El formato del email es inválido." }),
    password: z.string().min(8, { message: "La contraseña debe tener al menos 8 caracteres." }),
    confirmPassword: z.string(),
    phone: z.string().optional(),
    address_line: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postal_code: z.string().optional(),
    country_code: z.string().optional(),
    tax_id: z.string().optional(),
    industry: z.string().optional(),
    bank_number: z.string().optional(),
    bank_name: z.string().optional(),
    bank_account_type: z.string().optional(),
    business_legal_name: z.string().optional(),
    ci_number: z.string().optional(),
    gender: z.enum(["male", "female"]).optional(),
    business_type: z.enum(["individual", "business"], {
      required_error: "Debes seleccionar un tipo de negocio.",
    }),
    ci_picture: z.instanceof(File, { message: "La foto de tu CI es requerida." }),
    tax_id_picture: z.instanceof(File).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "La contraseña y su confirmación no coinciden.",
    path: ["confirmPassword"],
  })

export const Register = () => {
  const [success, setSuccess] = useState(false)
  const { t } = useTranslation()

  const form = useForm<z.infer<typeof RegisterSchema>>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      name: "",
      member_name: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      address_line: "",
      city: "",
      state: "",
      postal_code: "",
      country_code: "",
      tax_id: "",
      industry: "",
      bank_number: "",
      bank_name: "",
      bank_account_type: "",
      business_legal_name: "",
      ci_number: "",
      gender: undefined,
      business_type: "individual",
    },
  })

  // CHANGED: use the new pair
  const { mutateAsync: signUpBare, isPending: isSignUpPending } = useSignUpWithEmailPassBare()
  const { mutateAsync: createExtended, isPending: isCreatePending } = useCreateSellerExtended()
  const isPending = isSignUpPending || isCreatePending

  const fillDemo = () => {
    const rnd = Math.floor(Math.random() * 10000)
    form.setValue("name", `Tienda Demo ${rnd}`)
    form.setValue("member_name", "Juan Pérez")
    form.setValue("email", `demo${rnd}@example.com`)
    form.setValue("password", "SuperSecure123")
    form.setValue("confirmPassword", "SuperSecure123")
    form.setValue("phone", "+59170000000")
    form.setValue("address_line", "Av. Demo 123")
    form.setValue("city", "La Paz")
    form.setValue("state", "LP")
    form.setValue("postal_code", "0000")
    form.setValue("country_code", "BO")
    form.setValue("tax_id", "1234567")
    form.setValue("industry", "Gastronomía")
    form.setValue("bank_name", "Banco Demo")
    form.setValue("bank_number", "00123456789")
    form.setValue("bank_account_type", "Caja de Ahorro")
    form.setValue("business_legal_name", "Tienda Demo S.R.L.")
    form.setValue("ci_number", "12345678")
    form.setValue("gender", "male")
    form.setValue("business_type", "individual")
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      console.log("[register] submit values", { ...values, password: "********", confirmPassword: "********" })

      if (values.password !== values.confirmPassword) {
        form.setError("password", { type: "manual", message: "La contraseña y su confirmación no coinciden." })
        form.setError("confirmPassword", { type: "manual", message: "La contraseña y su confirmación no coinciden." })
        return
      }

      console.log("[register] uploading CI…")
      const ci = await uploadImage(values.ci_picture)
      console.log("[register] CI uploaded", ci)

      let tax: Awaited<ReturnType<typeof uploadImage>> | undefined
      if (values.tax_id_picture) {
        console.log("[register] uploading TAX…")
        tax = await uploadImage(values.tax_id_picture)
        console.log("[register] TAX uploaded", tax)
      }

      const payload: RegisterPayload = {
        name: values.name,
        member_name: values.member_name,
        email: values.email,
        password: values.password,
        confirmPassword: values.confirmPassword,

        phone: values.phone || undefined,
        address_line: values.address_line || undefined,
        city: values.city || undefined,
        state: values.state || undefined,
        postal_code: values.postal_code || undefined,
        country_code: values.country_code || undefined,
        tax_id: values.tax_id || undefined,

        industry: values.industry || undefined,
        bank_number: values.bank_number || undefined,
        bank_name: values.bank_name || undefined,
        bank_account_type: values.bank_account_type || undefined,
        business_legal_name: values.business_legal_name || undefined,
        ci_number: values.ci_number || undefined,
        gender: values.gender || undefined,
        business_type: values.business_type,

        ci_picture_key: ci.key,
        ...(tax?.key ? { tax_id_picture_key: tax.key } : {}),

        ...(ci.publicUrl ? { ci_picture_url: ci.publicUrl } : {}),
        ...(tax?.publicUrl ? { tax_id_picture_url: tax.publicUrl } : {}),
      }

      console.log("[register] final signup payload", payload)

      // STEP 1: create auth identity (no seller side-effect)
      await signUpBare({
        email: payload.email,
        password: payload.password,
        confirmPassword: payload.confirmPassword,
      })

      // STEP 2: create the seller request with extended data
      await createExtended({
        name: payload.name,
        member: { name: payload.member_name, email: payload.email },
        seller: {
          email: payload.email,
          phone: payload.phone,
          address_line: payload.address_line,
          city: payload.city,
          state: payload.state,
          postal_code: payload.postal_code,
          country_code: payload.country_code,
          tax_id: payload.tax_id,
        },
        seller_data: {
          business_legal_name: payload.business_legal_name,
          business_type: payload.business_type,
          industry: payload.industry,
          gender: payload.gender,
          ci_number: payload.ci_number,
          bank_name: payload.bank_name,
          bank_number: payload.bank_number,
          bank_account_type: payload.bank_account_type,
          ci_picture_key: payload.ci_picture_key,
          tax_id_picture_key: payload.tax_id_picture_key,
          ci_picture_url: payload.ci_picture_url,
          tax_id_picture_url: payload.tax_id_picture_url,
        },
      })

      console.log("[register] signup success")
      setSuccess(true)
    } catch (e: unknown) {
      console.log("[register] submit catch", e)
      const err = e as Error
      if (isFetchError(err) && (err as any).status === 401) {
        form.setError("email", { type: "manual", message: err.message })
      } else {
        form.setError("root.serverError", { type: "manual", message: err.message })
      }
    }
  })

  const serverError = form.formState.errors?.root?.serverError?.message
  const validationError =
    form.formState.errors.email?.message ||
    form.formState.errors.password?.message ||
    form.formState.errors.name?.message ||
    form.formState.errors.confirmPassword?.message ||
    form.formState.errors.member_name?.message

  if (success)
    return (
      <div className="bg-ui-bg-subtle flex min-h-dvh w-dvw items-center justify-center">
        <div className="mb-4 flex flex-col items-center">
          <Heading>¡Gracias por registrarte!</Heading>
          <Text size="small" className="text-ui-fg-subtle text-center mt-2 max-w-[320px]">
            Es posible que debas esperar autorización del administrador antes de iniciar sesión. Te
            enviaremos un correo de confirmación.
          </Text>
          <Link to="/login">
            <Button className="mt-8">Volver al inicio de sesión</Button>
          </Link>
        </div>
      </div>
    )

  return (
    <div className="bg-ui-bg-subtle flex min-h-dvh w-dvw items-center justify-center">
      <div className="m-4 flex w-full max-w-[420px] flex-col items-center">
        <AvatarBox />
        <div className="mb-4 flex flex-col items-center">
          <Heading>{t("register.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle text-center">
            {t("register.hint")}
          </Text>
        </div>

        <div className="flex w-full flex-col gap-y-3">
          <Button type="button" variant="secondary" onClick={fillDemo} className="self-end -mb-2">
            Rellenar datos de prueba
          </Button>

          <Form {...form}>
            <form onSubmit={handleSubmit} className="flex w-full flex-col gap-y-6">
              {/* (form unchanged) */}
              {/* Account + Owner */}
              <div className="flex flex-col gap-y-2">
                <Form.Field
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Control>
                        <Input {...field} className="bg-ui-bg-field-component mb-2" placeholder="Nombre de la tienda" />
                      </Form.Control>
                    </Form.Item>
                  )}
                />
                <Form.Field
                  control={form.control}
                  name="member_name"
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Control>
                        <Input {...field} className="bg-ui-bg-field-component" placeholder="Nombre del propietario" />
                      </Form.Control>
                    </Form.Item>
                  )}
                />
                <Form.Field
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Control>
                        <Input {...field} className="bg-ui-bg-field-component" placeholder={t("fields.email")} />
                      </Form.Control>
                    </Form.Item>
                  )}
                />
                <Form.Field
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Control>
                        <Input type="password" {...field} className="bg-ui-bg-field-component" placeholder={t("fields.password")} />
                      </Form.Control>
                    </Form.Item>
                  )}
                />
                <Form.Field
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Control>
                        <Input type="password" {...field} className="bg-ui-bg-field-component" placeholder="Confirmar contraseña" />
                      </Form.Control>
                    </Form.Item>
                  )}
                />
              </div>

              {/* Store type */}
              <div className="grid grid-cols-2 gap-2">
                <Form.Field
                  control={form.control}
                  name="business_type"
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Control>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <Select.Trigger>
                            <Select.Value placeholder="Tipo de negocio" />
                          </Select.Trigger>
                          <Select.Content>
                            <Select.Item value="individual">Persona natural</Select.Item>
                            <Select.Item value="business">Empresa</Select.Item>
                          </Select.Content>
                        </Select>
                      </Form.Control>
                    </Form.Item>
                  )}
                />
                <Form.Field
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Control>
                        <Select value={field.value || ""} onValueChange={(v) => field.onChange(v || undefined)}>
                          <Select.Trigger>
                            <Select.Value placeholder="Género (opcional)" />
                          </Select.Trigger>
                          <Select.Content>
                            <Select.Item value="male">Masculino</Select.Item>
                            <Select.Item value="female">Femenino</Select.Item>
                          </Select.Content>
                        </Select>
                      </Form.Control>
                    </Form.Item>
                  )}
                />
              </div>

              {/* Legal / banking */}
              <div className="grid grid-cols-2 gap-2">
                <Form.Field
                  control={form.control}
                  name="business_legal_name"
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Control>
                        <Input {...field} placeholder="Razón social (opcional)" />
                      </Form.Control>
                    </Form.Item>
                  )}
                />
                <Form.Field
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Control>
                        <Input {...field} placeholder="Rubro/Industria (opcional)" />
                      </Form.Control>
                    </Form.Item>
                  )}
                />
                <Form.Field
                  control={form.control}
                  name="tax_id"
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Control>
                        <Input {...field} placeholder="NIT (opcional)" />
                      </Form.Control>
                    </Form.Item>
                  )}
                />
                <Form.Field
                  control={form.control}
                  name="ci_number"
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Control>
                        <Input {...field} placeholder="CI (opcional)" />
                      </Form.Control>
                    </Form.Item>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Form.Field
                  control={form.control}
                  name="bank_name"
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Control>
                        <Input {...field} placeholder="Banco (opcional)" />
                      </Form.Control>
                    </Form.Item>
                  )}
                />
                <Form.Field
                  control={form.control}
                  name="bank_number"
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Control>
                        <Input {...field} placeholder="Cuenta (opcional)" />
                      </Form.Control>
                    </Form.Item>
                  )}
                />
                <Form.Field
                  control={form.control}
                  name="bank_account_type"
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Control>
                        <Input {...field} placeholder="Tipo (opcional)" />
                      </Form.Control>
                    </Form.Item>
                  )}
                />
              </div>

              {/* Contact / address */}
              <div className="grid grid-cols-2 gap-2">
                <Form.Field
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Control>
                        <Input {...field} placeholder="Teléfono (opcional)" />
                      </Form.Control>
                    </Form.Item>
                  )}
                />
                <Form.Field
                  control={form.control}
                  name="address_line"
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Control>
                        <Input {...field} placeholder="Dirección (opcional)" />
                      </Form.Control>
                    </Form.Item>
                  )}
                />
                <Form.Field
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Control>
                        <Input {...field} placeholder="Ciudad (opcional)" />
                      </Form.Control>
                    </Form.Item>
                  )}
                />
                <Form.Field
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Control>
                        <Input {...field} placeholder="Departamento/Estado (opcional)" />
                      </Form.Control>
                    </Form.Item>
                  )}
                />
                <Form.Field
                  control={form.control}
                  name="postal_code"
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Control>
                        <Input {...field} placeholder="Código postal (opcional)" />
                      </Form.Control>
                    </Form.Item>
                  )}
                />
                <Form.Field
                  control={form.control}
                  name="country_code"
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Control>
                        <Input {...field} placeholder="Código país (ej. BO)" />
                      </Form.Control>
                    </Form.Item>
                  )}
                />
              </div>

              {/* Files */}
              <div className="grid grid-cols-2 gap-2">
                <Form.Field
                  control={form.control}
                  name="ci_picture"
                  render={() => (
                    <Form.Item>
                      <Form.Control>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) form.setValue("ci_picture", f, { shouldValidate: true })
                          }}
                        />
                      </Form.Control>
                      <Text size="xsmall" className="text-ui-fg-subtle">
                        Foto CI (requerida)
                      </Text>
                    </Form.Item>
                  )}
                />
                <Form.Field
                  control={form.control}
                  name="tax_id_picture"
                  render={() => (
                    <Form.Item>
                      <Form.Control>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) form.setValue("tax_id_picture", f, { shouldValidate: true })
                          }}
                        />
                      </Form.Control>
                      <Text size="xsmall" className="text-ui-fg-subtle">
                        Foto NIT (opcional)
                      </Text>
                    </Form.Item>
                  )}
                />
              </div>

              {/* Errors / submit */}
              {validationError && (
                <div className="text-center">
                  <Hint className="inline-flex" variant={"error"}>
                    {validationError}
                  </Hint>
                </div>
              )}
              {serverError && (
                <Alert className="bg-ui-bg-base items-center p-2" dismissible variant="error">
                  {serverError}
                </Alert>
              )}

              <Button className="w-full" type="submit" isLoading={isPending}>
                Registrarme
              </Button>
            </form>
          </Form>
        </div>

        <span className="text-ui-fg-muted txt-small my-6">
          <Trans
            i18nKey="register.alreadySeller"
            components={[
              <Link
                to="/login"
                className="text-ui-fg-interactive transition-fg hover:text-ui-fg-interactive-hover focus-visible:text-ui-fg-interactive-hover font-medium outline-none"
              />,
            ]}
          />
        </span>
      </div>
    </div>
  )
}
