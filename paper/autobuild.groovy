/*--------------------------------------
 * Imports.
 *------------------------------------*/

import groovy.io.FileType

/*--------------------------------------
 * Functions.
 *------------------------------------*/

void main() {
  def srcDir = new File('src')

  def lastModified = [:]
  while (true) {
    def isFileChanged = false

    srcDir.eachFileRecurse(FileType.ANY) {
      def t1 = lastModified.get(it.path)
      def t2 = it.lastModified()

      if (t1 && t1 != t2) {
        isFileChanged = true
      }

      lastModified[it.path] = t2
    }

    if (isFileChanged) {
      'gradlew.bat build'.execute().waitForProcessOutput(System.out, System.err)
    }

    sleep 1000
  }
}

/*--------------------------------------
 * Entry point.
 *------------------------------------*/

main()
