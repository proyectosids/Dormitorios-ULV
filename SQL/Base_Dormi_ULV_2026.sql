USE [master]
GO

-- 1. ELIMINAR BASE DE DATOS ANTERIOR (Limpieza)
IF EXISTS (SELECT name FROM sys.databases WHERE name = N'Dormitorios_ULV')
    DROP DATABASE [Dormitorios_ULV]
GO

-- 2. CREAR BASE DE DATOS NUEVA
CREATE DATABASE [Dormitorios_ULV]
GO

USE [Dormitorios_ULV]
GO

-- 3. CREAR EL ESQUEMA 'dormi'
CREATE SCHEMA [dormi] AUTHORIZATION [dbo]
GO

-- CONFIGURACIONES BÁSICAS (Copiadas de tu script)
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- 4. CREACIÓN DE TABLAS (Usando [dormi])
-- =============================================

-- Tabla: Amonestaciones
CREATE TABLE [dormi].[Amonestaciones](
	[IdAmonestacion] [int] IDENTITY(1,1) NOT NULL,
	[MatriculaEstudiante] [varchar](10) NOT NULL,
	[ClavePreceptor] [varchar](10) NOT NULL,
	[IdNivel] [int] NOT NULL,
	[Fecha] [date] NOT NULL,
	[Motivo] [varchar](200) NOT NULL,
PRIMARY KEY CLUSTERED ([IdAmonestacion] ASC)
) ON [PRIMARY]
GO

-- Tabla: AsistenciasCultos
CREATE TABLE [dormi].[AsistenciasCultos](
	[IdAsistencia] [int] IDENTITY(1,1) NOT NULL,
	[MatriculaEstudiante] [varchar](10) NOT NULL,
	[IdTipoCulto] [int] NOT NULL,
	[Fecha] [date] NOT NULL,
	[Hora] [time](7) NOT NULL DEFAULT (CONVERT([time],getdate())),
	[RegistradoPor] [varchar](10) NOT NULL,
PRIMARY KEY CLUSTERED ([IdAsistencia] ASC)
) ON [PRIMARY]
GO

-- Tabla: Cat_NivelAmonestacion
CREATE TABLE [dormi].[Cat_NivelAmonestacion](
	[IdNivel] [int] IDENTITY(1,1) NOT NULL,
	[Nombre] [varchar](50) NOT NULL,
PRIMARY KEY CLUSTERED ([IdNivel] ASC),
UNIQUE NONCLUSTERED ([Nombre] ASC)
) ON [PRIMARY]
GO

-- Tabla: Cat_TipoCulto
CREATE TABLE [dormi].[Cat_TipoCulto](
	[IdTipoCulto] [int] IDENTITY(1,1) NOT NULL,
	[Nombre] [varchar](50) NOT NULL,
PRIMARY KEY CLUSTERED ([IdTipoCulto] ASC),
UNIQUE NONCLUSTERED ([Nombre] ASC)
) ON [PRIMARY]
GO

-- Tabla: Cat_TipoReporte
CREATE TABLE [dormi].[Cat_TipoReporte](
	[IdTipoReporte] [int] IDENTITY(1,1) NOT NULL,
	[Nombre] [varchar](100) NOT NULL,
PRIMARY KEY CLUSTERED ([IdTipoReporte] ASC),
UNIQUE NONCLUSTERED ([Nombre] ASC)
) ON [PRIMARY]
GO

-- Tabla: CortesLimpieza
CREATE TABLE [dormi].[CortesLimpieza](
	[IdCorte] [int] IDENTITY(1,1) NOT NULL,
	[FechaCorte] [datetime] NULL DEFAULT (getdate()),
	[RealizadoPor] [varchar](10) NULL,
PRIMARY KEY CLUSTERED ([IdCorte] ASC)
) ON [PRIMARY]
GO

-- Tabla: CriteriosLimpieza
CREATE TABLE [dormi].[CriteriosLimpieza](
	[IdCriterio] [int] IDENTITY(1,1) NOT NULL,
	[Descripcion] [varchar](200) NOT NULL,
PRIMARY KEY CLUSTERED ([IdCriterio] ASC)
) ON [PRIMARY]
GO

-- Tabla: Cuartos
CREATE TABLE [dormi].[Cuartos](
	[IdCuarto] [int] IDENTITY(1,1) NOT NULL,
	[IdPasillo] [int] NOT NULL,
	[NumeroCuarto] [int] NOT NULL,
	[Capacidad] [int] NOT NULL DEFAULT ((4)),
PRIMARY KEY CLUSTERED ([IdCuarto] ASC)
) ON [PRIMARY]
GO

-- Tabla: Dormitorios
CREATE TABLE [dormi].[Dormitorios](
	[IdDormitorio] [int] IDENTITY(1,1) NOT NULL,
	[NombreDormitorio] [varchar](100) NOT NULL,
PRIMARY KEY CLUSTERED ([IdDormitorio] ASC)
) ON [PRIMARY]
GO

-- Tabla: Estudiantes
CREATE TABLE [dormi].[Estudiantes](
	[Matricula] [varchar](10) NOT NULL,
	[NombreCompleto] [varchar](100) NOT NULL,
	[Carrera] [varchar](100) NULL,
	[IdCuarto] [int] NULL,
	[IdPasillo] [int] NULL,
	[IdDormitorio] [int] NULL,
	[Correo] [varchar](100) NULL,
PRIMARY KEY CLUSTERED ([Matricula] ASC)
) ON [PRIMARY]
GO

-- Tabla: Limpieza
CREATE TABLE [dormi].[Limpieza](
	[IdLimpieza] [int] IDENTITY(1,1) NOT NULL,
	[IdCuarto] [int] NOT NULL,
	[Fecha] [date] NOT NULL,
	[EvaluadoPorMatricula] [varchar](10) NOT NULL,
	[Observaciones] [varchar](300) NULL,
	[TotalFinal] [int] NULL,
	[OrdenGeneral] [int] NULL,
	[Disciplina] [int] NULL,
PRIMARY KEY CLUSTERED ([IdLimpieza] ASC)
) ON [PRIMARY]
GO

-- Tabla: LimpiezaDetalle
CREATE TABLE [dormi].[LimpiezaDetalle](
	[IdDetalle] [int] IDENTITY(1,1) NOT NULL,
	[IdLimpieza] [int] NOT NULL,
	[IdCriterio] [int] NOT NULL,
	[Calificacion] [int] NOT NULL,
PRIMARY KEY CLUSTERED ([IdDetalle] ASC)
) ON [PRIMARY]
GO

-- Tabla: Pasillos
CREATE TABLE [dormi].[Pasillos](
	[IdPasillo] [int] IDENTITY(1,1) NOT NULL,
	[IdDormitorio] [int] NOT NULL,
	[NombrePasillo] [varchar](50) NOT NULL,
PRIMARY KEY CLUSTERED ([IdPasillo] ASC)
) ON [PRIMARY]
GO

-- Tabla: Preceptores
CREATE TABLE [dormi].[Preceptores](
	[ClaveEmpleado] [varchar](10) NOT NULL,
	[NombreCompleto] [varchar](100) NOT NULL,
	[IdDormitorio] [int] NULL,
	[Correo] [varchar](100) NULL,
PRIMARY KEY CLUSTERED ([ClaveEmpleado] ASC)
) ON [PRIMARY]
GO

-- Tabla: Reportes
CREATE TABLE [dormi].[Reportes](
	[IdReporte] [int] IDENTITY(1,1) NOT NULL,
	[MatriculaReportado] [varchar](10) NOT NULL,
	[ReportadoPor] [varchar](10) NOT NULL,
	[TipoUsuarioReportante] [varchar](15) NOT NULL,
	[Motivo] [text] NOT NULL,
	[FechaReporte] [datetime] NOT NULL DEFAULT (getdate()),
	[Estado] [varchar](20) NOT NULL DEFAULT ('Pendiente'),
	[ClavePreceptorAprobador] [varchar](10) NULL,
	[FechaAprobacion] [datetime] NULL,
	[IdTipoReporte] [int] NOT NULL DEFAULT ((1)),
PRIMARY KEY CLUSTERED ([IdReporte] ASC)
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

-- Tabla: Roles
CREATE TABLE [dormi].[Roles](
	[IdRol] [int] IDENTITY(1,1) NOT NULL,
	[NombreRol] [varchar](50) NOT NULL,
PRIMARY KEY CLUSTERED ([IdRol] ASC),
UNIQUE NONCLUSTERED ([NombreRol] ASC)
) ON [PRIMARY]
GO

-- Tabla: Semestres
CREATE TABLE [dormi].[Semestres](
	[IdSemestre] [int] IDENTITY(1,1) NOT NULL,
	[Nombre] [varchar](50) NOT NULL,
	[FechaInicio] [datetime] NOT NULL,
	[FechaFin] [datetime] NULL,
	[Activo] [bit] NULL DEFAULT ((1)),
PRIMARY KEY CLUSTERED ([IdSemestre] ASC)
) ON [PRIMARY]
GO

-- Tabla: Usuarios
CREATE TABLE [dormi].[Usuarios](
	[UsuarioID] [varchar](10) NOT NULL,
	[Password] [varchar](255) NULL,
	[IdRol] [int] NOT NULL,
	[FechaRegistro] [datetime] NULL DEFAULT (getdate()),
	[FCMToken] [varchar](max) NULL,
PRIMARY KEY CLUSTERED ([UsuarioID] ASC)
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

-- =============================================
-- 5. RELACIONES (Foreign Keys apuntando a [dormi])
-- =============================================

ALTER TABLE [dormi].[Amonestaciones]  WITH CHECK ADD FOREIGN KEY([ClavePreceptor])
REFERENCES [dormi].[Preceptores] ([ClaveEmpleado])
GO

ALTER TABLE [dormi].[Amonestaciones]  WITH CHECK ADD FOREIGN KEY([IdNivel])
REFERENCES [dormi].[Cat_NivelAmonestacion] ([IdNivel])
GO

ALTER TABLE [dormi].[Amonestaciones]  WITH CHECK ADD FOREIGN KEY([MatriculaEstudiante])
REFERENCES [dormi].[Estudiantes] ([Matricula])
GO

ALTER TABLE [dormi].[AsistenciasCultos]  WITH CHECK ADD FOREIGN KEY([IdTipoCulto])
REFERENCES [dormi].[Cat_TipoCulto] ([IdTipoCulto])
GO

ALTER TABLE [dormi].[AsistenciasCultos]  WITH CHECK ADD FOREIGN KEY([MatriculaEstudiante])
REFERENCES [dormi].[Estudiantes] ([Matricula])
GO

ALTER TABLE [dormi].[CortesLimpieza]  WITH CHECK ADD  CONSTRAINT [FK_Cortes_Preceptores] FOREIGN KEY([RealizadoPor])
REFERENCES [dormi].[Preceptores] ([ClaveEmpleado])
GO

ALTER TABLE [dormi].[Cuartos]  WITH CHECK ADD FOREIGN KEY([IdPasillo])
REFERENCES [dormi].[Pasillos] ([IdPasillo])
GO

ALTER TABLE [dormi].[Estudiantes]  WITH CHECK ADD FOREIGN KEY([IdCuarto])
REFERENCES [dormi].[Cuartos] ([IdCuarto])
GO

ALTER TABLE [dormi].[Estudiantes]  WITH CHECK ADD FOREIGN KEY([Matricula])
REFERENCES [dormi].[Usuarios] ([UsuarioID])
GO

ALTER TABLE [dormi].[Limpieza]  WITH CHECK ADD FOREIGN KEY([IdCuarto])
REFERENCES [dormi].[Cuartos] ([IdCuarto])
GO

ALTER TABLE [dormi].[LimpiezaDetalle]  WITH CHECK ADD FOREIGN KEY([IdCriterio])
REFERENCES [dormi].[CriteriosLimpieza] ([IdCriterio])
GO

ALTER TABLE [dormi].[LimpiezaDetalle]  WITH CHECK ADD FOREIGN KEY([IdLimpieza])
REFERENCES [dormi].[Limpieza] ([IdLimpieza])
GO

ALTER TABLE [dormi].[Pasillos]  WITH CHECK ADD FOREIGN KEY([IdDormitorio])
REFERENCES [dormi].[Dormitorios] ([IdDormitorio])
GO

ALTER TABLE [dormi].[Preceptores]  WITH CHECK ADD FOREIGN KEY([ClaveEmpleado])
REFERENCES [dormi].[Usuarios] ([UsuarioID])
GO

ALTER TABLE [dormi].[Preceptores]  WITH CHECK ADD FOREIGN KEY([IdDormitorio])
REFERENCES [dormi].[Dormitorios] ([IdDormitorio])
GO

ALTER TABLE [dormi].[Reportes]  WITH CHECK ADD FOREIGN KEY([ClavePreceptorAprobador])
REFERENCES [dormi].[Preceptores] ([ClaveEmpleado])
GO

ALTER TABLE [dormi].[Reportes]  WITH CHECK ADD FOREIGN KEY([MatriculaReportado])
REFERENCES [dormi].[Estudiantes] ([Matricula])
GO

ALTER TABLE [dormi].[Reportes]  WITH CHECK ADD  CONSTRAINT [FK_Reportes_Tipo] FOREIGN KEY([IdTipoReporte])
REFERENCES [dormi].[Cat_TipoReporte] ([IdTipoReporte])
GO

ALTER TABLE [dormi].[Usuarios]  WITH CHECK ADD FOREIGN KEY([IdRol])
REFERENCES [dormi].[Roles] ([IdRol])
GO

-- Checks de validación
ALTER TABLE [dormi].[Limpieza]  WITH CHECK ADD CHECK  (([Disciplina]>=(0) AND [Disciplina]<=(10)))
GO
ALTER TABLE [dormi].[Limpieza]  WITH CHECK ADD CHECK  (([OrdenGeneral]>=(0) AND [OrdenGeneral]<=(10)))
GO
ALTER TABLE [dormi].[LimpiezaDetalle]  WITH CHECK ADD CHECK  (([Calificacion]>=(0) AND [Calificacion]<=(10)))
GO

USE [master]
GO
ALTER DATABASE [Dormitorios_ULV] SET  READ_WRITE 
GO